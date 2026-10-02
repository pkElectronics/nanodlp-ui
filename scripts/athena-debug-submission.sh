#!/usr/bin/env bash

set -u

LOCAL_MODE=0
LOCAL_TOKEN=""
TICKET_DATA=""
TIMESTAMP="null"
FAIL_STAGE="initialization"
STAGING_DIR=""
TEMP_PUBLISH=""
TICKETS_DIR="/home/pi/printer/public/tickets"
LOCAL_ARCHIVE=""
READY_MARKER=""
ERROR_MARKER=""

if [[ "${1-}" == "--local" ]]; then
    LOCAL_MODE=1
    LOCAL_TOKEN="${2-}"
    if [[ $# -ne 2 || ! "$LOCAL_TOKEN" =~ ^[0-9a-f]{32}$ ]]; then
        printf '%s\n' 'Invalid local diagnostic token.' >&2
        exit 2
    fi

    LOCAL_ARCHIVE="$TICKETS_DIR/athena-diagnostics-${LOCAL_TOKEN}.tar.gz"
    READY_MARKER="$TICKETS_DIR/${LOCAL_TOKEN}.ready"
    ERROR_MARKER="$TICKETS_DIR/${LOCAL_TOKEN}.error"
    TEMP_PUBLISH="$TICKETS_DIR/.athena-diagnostics-${LOCAL_TOKEN}.part.$$"
    if ! mkdir -p -- "$TICKETS_DIR"; then
        printf '%s\n' 'Could not access the local diagnostic download directory.' >&2
        exit 1
    fi
    rm -f -- "$LOCAL_ARCHIVE" "$READY_MARKER" "$ERROR_MARKER" "$TEMP_PUBLISH"
else
    if [[ $# -ne 1 ]]; then
        printf '%s\n' 'Ticket submission data is required.' >&2
        exit 2
    fi
    TICKET_DATA="$1"
    DECODED_JSON="$(base64 -d <<< "$TICKET_DATA")" || {
        printf '%s\n' 'Could not decode support ticket data.' >&2
        exit 1
    }
    TIMESTAMP="$(jq -r '.timestamp // "null"' <<< "$DECODED_JSON")" || {
        printf '%s\n' 'Could not read the support ticket timestamp.' >&2
        exit 1
    }
fi

cleanup() {
    local result=$?
    trap - EXIT

    if [[ -n "$STAGING_DIR" && -d "$STAGING_DIR" ]]; then
        rm -rf -- "$STAGING_DIR"
    fi

    if (( LOCAL_MODE )); then
        rm -f -- "$TEMP_PUBLISH"
        if (( result != 0 )); then
            rm -f -- "$LOCAL_ARCHIVE" "$READY_MARKER"
            local error_tmp="${ERROR_MARKER}.tmp.$$"
            printf 'Diagnostic collection failed during %s. Check printer storage and local diagnostic sources; no download archive was published.\n' \
                "${FAIL_STAGE:-collection}" > "$error_tmp" 2>/dev/null &&
                mv -f -- "$error_tmp" "$ERROR_MARKER" 2>/dev/null
        fi

        # Keep the temporary download and its status markers available long enough
        # for a user to retrieve them, then remove all token-specific files.
        nohup sh -c 'sleep 600; rm -f -- "$@"' athena-diagnostic-cleanup \
            "$LOCAL_ARCHIVE" "$READY_MARKER" "$ERROR_MARKER" "$TEMP_PUBLISH" \
            >/dev/null 2>&1 </dev/null &
    fi

    return "$result"
}

fail() {
    FAIL_STAGE="$1"
    printf 'Athena diagnostic collection failed during %s.\n' "$FAIL_STAGE" >&2
    exit 1
}

trap cleanup EXIT

umask 077
FAIL_STAGE="creating a private staging directory"
STAGING_DIR="$(mktemp -d /home/pi/printer/.athena-debug.XXXXXX)" || fail "$FAIL_STAGE"
DIAGNOSTIC_DIR="$STAGING_DIR/athena-debug"
mkdir -m 700 -- "$DIAGNOSTIC_DIR" || fail "$FAIL_STAGE"

FAIL_STAGE="reading printer serial number"
RPI_SERIAL="$(tr -d '\0' < /sys/firmware/devicetree/base/serial-number 2>/dev/null)" || fail "$FAIL_STAGE"
[[ -n "$RPI_SERIAL" ]] || RPI_SERIAL="unknown"

copy_if_available() {
    local source="$1"
    local destination_name="${2:-$(basename -- "$source")}"
    if [[ -r "$source" ]]; then
        cp -f -- "$source" "$DIAGNOSTIC_DIR/$destination_name" 2>/dev/null || true
    fi
}

FAIL_STAGE="downloading the NanoDLP debug archive"
wget -q -O "$DIAGNOSTIC_DIR/nanodlp-debug.tar.gz" http://127.0.0.1/debug || fail "$FAIL_STAGE"

FAIL_STAGE="downloading NanoDLP analytics"
wget -q -O "$DIAGNOSTIC_DIR/analytics-50k.json" http://127.0.0.1/analytic/data/50000 || fail "$FAIL_STAGE"

copy_if_available /tmp/klippy.log
copy_if_available /home/pi/printer.cfg
copy_if_available /home/pi/led_macros.cfg
copy_if_available /home/pi/printer_type
copy_if_available /home/pi/channel
copy_if_available /home/pi/image_version
copy_if_available /home/pi/updateconfig.json
copy_if_available /home/pi/athena_update.log
copy_if_available /sys/firmware/devicetree/base/serial-number
copy_if_available /etc/hostname
copy_if_available /var/log/nginx/error.log nginx-error.log
copy_if_available /var/log/athena-iot.log
copy_if_available /opt/orion_level.log
copy_if_available /opt/orion_leveling_calibration.json

if [[ -d /boot/firmware ]]; then
    copy_if_available /boot/firmware/config.txt
    copy_if_available /boot/firmware/cmdline.txt
fi

if command -v lsusb >/dev/null 2>&1; then
    lsusb > "$DIAGNOSTIC_DIR/lsusb" 2>&1 || true
fi
if command -v kmsprint >/dev/null 2>&1; then
    kmsprint --device /dev/dri/card0 > "$DIAGNOSTIC_DIR/card0" 2>&1 || true
    kmsprint --device /dev/dri/card1 > "$DIAGNOSTIC_DIR/card1" 2>&1 || true
    kmsprint --device /dev/dri/card2 > "$DIAGNOSTIC_DIR/card2" 2>&1 || true
fi
ps auxf > "$DIAGNOSTIC_DIR/processes" 2>&1 || true
journalctl -n 10000 --no-pager > "$DIAGNOSTIC_DIR/syslog" 2>&1 || true

if (( LOCAL_MODE )); then
    FAIL_STAGE="checking atomic archive publication"
    staging_device="$(stat -c '%d' "$STAGING_DIR")" || fail "$FAIL_STAGE"
    tickets_device="$(stat -c '%d' "$TICKETS_DIR")" || fail "$FAIL_STAGE"
    [[ "$staging_device" == "$tickets_device" ]] || fail "$FAIL_STAGE"
    ARCHIVE_PATH="$STAGING_DIR/athena-diagnostics-${LOCAL_TOKEN}.tar.gz"
else
    ARCHIVE_PATH="$STAGING_DIR/${RPI_SERIAL}.tar.gz"
fi

FAIL_STAGE="creating the diagnostic archive"
tar -czf "$ARCHIVE_PATH" -C "$STAGING_DIR" athena-debug || fail "$FAIL_STAGE"

if (( LOCAL_MODE )); then
    FAIL_STAGE="publishing the local diagnostic archive"
    chmod 644 -- "$ARCHIVE_PATH" || fail "$FAIL_STAGE"
    mv -f -- "$ARCHIVE_PATH" "$TEMP_PUBLISH" || fail "$FAIL_STAGE"
    mv -f -- "$TEMP_PUBLISH" "$LOCAL_ARCHIVE" || fail "$FAIL_STAGE"

    FAIL_STAGE="writing the download-ready marker"
    marker_tmp="${READY_MARKER}.tmp.$$"
    : > "$marker_tmp" || fail "$FAIL_STAGE"
    chmod 644 -- "$marker_tmp" || fail "$FAIL_STAGE"
    mv -f -- "$marker_tmp" "$READY_MARKER" || fail "$FAIL_STAGE"
    exit 0
fi

# Keep the existing ticket transport protocol and ticket metadata handling.
curl -F "debugfile=@$ARCHIVE_PATH" \
    -H "Content-Type: multipart/form-data" \
    -H "ATHENA-USER-EMAIL: $TICKET_DATA" \
    https://olymp.concepts3d.eu/api/debugfile &>/dev/null
error_level=$?
if [[ $error_level -gt 0 ]]; then
    printf '%s\n' 'Debugfile submission failed.' >&2
    exit "$error_level"
fi

if [[ "$TIMESTAMP" =~ ^[0-9]+$ ]]; then
    mkdir -p -- "$TICKETS_DIR" || exit 1
    touch -- "$TICKETS_DIR/$TIMESTAMP" || exit 1
fi
