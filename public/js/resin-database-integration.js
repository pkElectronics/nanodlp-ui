/**
 * Resin Database Integration for NanoDLP Profiles Page
 * 
 * This script handles embedding the Athena Resin Database UI
 * into the NanoDLP profiles page using an iframe.
 */

(function() {
    'use strict';
    
    // Configuration - set these values or they will use defaults
    // You can override these by setting window.RESIN_DB_CONFIG before this script runs
    const RESIN_DB_CONFIG = window.RESIN_DB_CONFIG || {
        // URL of the resin database frontend
        databaseUrl: 'https://proteus.concepts3d.eu',
        
        // Machine type - can be auto-detected or manually set
        // Valid values: 'athena_1_8k', 'athena_1_12k', 'athena_2', 'athena_2_pro', 'athena_2_xl'
        // Leave empty string to auto-detect
        machineType: '',
        
        // Machine base URL for profile uploads
        // Use empty string for relative URLs (same origin) since everything runs in the same browser
        machineBaseUrl: '',
    };
    
    // Initialize when DOM is ready
    $(document).ready(function() {
        // Toggle database view
        $('#resin-db-toggle').on('click', function(e) {
            e.preventDefault();
            const container = $('#resin-database-container');
            if (container.is(':visible')) {
                container.slideUp();
            } else {
                container.slideDown();
                if (!container.data('initialized')) {
                    initializeResinDatabase();
                    container.data('initialized', true);
                }
            }
        });
        
        // Close database view
        $('#resin-db-close').on('click', function() {
            $('#resin-database-container').slideUp();
        });
        
        // Auto-detect machine type if not set
        if (!RESIN_DB_CONFIG.machineType) {
            detectMachineType().then(function(machineType) {
                RESIN_DB_CONFIG.machineType = machineType;
                if ($('#resin-database-container').data('initialized')) {
                    updateIframeUrl();
                }
            });
        }
    });
    
    /**
     * Initialize the resin database iframe
     */
    function initializeResinDatabase() {
        const iframe = document.getElementById('resin-database-iframe');
        if (!iframe) {
            console.error('Resin database iframe not found');
            return;
        }
        
        // Setup PostMessage listener first (before iframe loads)
        setupPostMessageListener();
        
        // Build iframe URL with embedded mode and machine type
        const iframeUrl = new URL(RESIN_DB_CONFIG.databaseUrl);
        iframeUrl.searchParams.set('embedded', 'true');
        if (RESIN_DB_CONFIG.machineType) {
            iframeUrl.searchParams.set('machine_type', RESIN_DB_CONFIG.machineType);
        }
        // Only set machine_base_url if explicitly provided (otherwise use relative URLs)
        if (RESIN_DB_CONFIG.machineBaseUrl && RESIN_DB_CONFIG.machineBaseUrl !== '') {
            iframeUrl.searchParams.set('machine_base_url', RESIN_DB_CONFIG.machineBaseUrl);
        }
        
        console.log('Loading iframe with URL:', iframeUrl.toString());
        iframe.src = iframeUrl.toString();
        
        // Update machine type badge
        updateMachineTypeBadge();
    }
    
    /**
     * Update iframe URL (e.g., when machine type changes)
     */
    function updateIframeUrl() {
        const iframe = document.getElementById('resin-database-iframe');
        if (!iframe) return;
        
        const currentUrl = new URL(iframe.src);
        if (RESIN_DB_CONFIG.machineType) {
            currentUrl.searchParams.set('machine_type', RESIN_DB_CONFIG.machineType);
        } else {
            currentUrl.searchParams.delete('machine_type');
        }
        iframe.src = currentUrl.toString();
        updateMachineTypeBadge();
    }
    
    /**
     * Detect machine type from system/API
     */
    function detectMachineType() {
        return new Promise(function(resolve) {
            // Try to detect from machine API
            $.ajax({
                url: '/static/printer_type',
                method: 'GET',
                success: function(data) {
                    if (data && data.machineType) {
                        resolve(data.machineType);
                        return;
                    }
                    resolve('athena_2'); // Default fallback
                },
                error: function() {
                    // Fallback to default
                    resolve('athena_2');
                }
            });
        });
    }
    
    // Track if listener is already set up
    let postMessageListenerSetup = false;
    
    /**
     * Setup PostMessage listener for communication with iframe
     */
    function setupPostMessageListener() {
        // Only set up listener once
        if (postMessageListenerSetup) {
            console.log('PostMessage listener already set up');
            return;
        }
        
        console.log('Setting up PostMessage listener');
        window.addEventListener('message', function(event) {
            // Log all messages for debugging
            console.log('Received PostMessage:', event.data, 'from origin:', event.origin);
            
            // Verify origin for security (in production, check against expected origin)
            // if (event.origin !== RESIN_DB_CONFIG.databaseUrl) return;
            
            try {
                const data = typeof event.data === 'string' 
                    ? JSON.parse(event.data) 
                    : event.data;
                
                console.log('Parsed message data:', data);
                
                if (!data || data.source !== 'athena-resin-db') {
                    console.log('Message not from athena-resin-db, ignoring. Source:', data ? data.source : 'null');
                    return;
                }
                
                console.log('Processing message type:', data.type);
                handleIframeMessage(data);
            } catch (e) {
                console.error('Error handling message from iframe:', e, 'Raw data:', event.data);
            }
        });
        
        postMessageListenerSetup = true;
    }
    
    /**
     * Handle messages from the embedded iframe
     */
    function handleIframeMessage(data) {
        console.log('Handling iframe message:', data);
        
        switch (data.type) {
            case 'ready':
                console.log('Resin database iframe is ready');
                sendInitMessage();
                break;
                
            case 'profile-selected':
                console.log('Profile selected:', data.profileId);
                // You can add custom logic here
                break;
                
            case 'upload-status':
                console.log('Upload status received:', data.status, data.message, 'profileId:', data.profileId);
                if (data.status === 'success') {
                    console.log('Upload successful, showing alert and reloading...');
                    showBootstrap3Alert('Profile uploaded successfully', 'success');
                    // Do a full window reload after a short delay to show the new profile
                    setTimeout(function() {
                        console.log('Reloading page...');
                        window.location.reload(true); // Force reload from server
                    }, 1500); // 1.5 second delay to show success message
                } else if (data.status === 'error') {
                    console.log('Upload failed:', data.message);
                    showBootstrap3Alert('Upload failed: ' + (data.message || 'Unknown error'), 'danger');
                }
                break;
                
            case 'upload-profile-request':
                console.log('Upload profile request received from iframe');
                handleUploadProfileRequest(data);
                break;
                
            default:
                console.log('Unknown message type:', data.type);
        }
    }
    
    /**
     * Send initialization message to iframe
     */
    function sendInitMessage() {
        const iframe = document.getElementById('resin-database-iframe');
        if (!iframe || !iframe.contentWindow) return;
        
        // Get the parent window's origin (the machine's origin)
        // This is needed so the iframe can make requests to the local machine API
        const parentOrigin = window.location.origin;
        
        const message = {
            type: 'init',
            config: {
                embedded: true,
                machineType: RESIN_DB_CONFIG.machineType,
                // Send parent origin so iframe can construct correct URLs for machine API
                parentOrigin: parentOrigin,
                // Only include machineBaseUrl if it's explicitly set (otherwise use parent origin)
                machineBaseUrl: RESIN_DB_CONFIG.machineBaseUrl || parentOrigin,
            }
        };
        
        iframe.contentWindow.postMessage(JSON.stringify(message), '*');
    }
    
    /**
     * Show Bootstrap 3 alert
     */
    function showBootstrap3Alert(message, type) {
        const alertDiv = $('<div>')
            .addClass('alert alert-' + type + ' alert-dismissible')
            .attr('role', 'alert')
            .css({
                'position': 'fixed',
                'top': '20px',
                'right': '20px',
                'z-index': '9999',
                'min-width': '300px'
            })
            .html('<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' + message);
        
        $('body').append(alertDiv);
        
        // Auto-dismiss after 5 seconds
        setTimeout(function() {
            alertDiv.fadeOut(function() {
                alertDiv.remove();
            });
        }, 5000);
    }
    
    /**
     * Update machine type badge in UI
     */
    function updateMachineTypeBadge() {
        const badge = $('#machine-type-badge');
        if (badge.length && RESIN_DB_CONFIG.machineType) {
            badge.text(formatMachineType(RESIN_DB_CONFIG.machineType));
            badge.show();
        }
    }
    
    /**
     * Format machine type for display
     */
    function formatMachineType(type) {
        const types = {
            'athena_1_8k': 'Athena 1 8K',
            'athena_1_12k': 'Athena 1 12K',
            'athena_2': 'Athena 2',
            'athena_2_pro': 'Athena 2 Pro',
            'athena_2_xl': 'Athena 2 XL',
        };
        return types[type] || type;
    }
    
    /**
     * Handle upload profile request from iframe
     * Parent window makes the upload request to avoid CORS issues
     */
    function handleUploadProfileRequest(data) {
        const uploadId = data.uploadId;
        const profileData = data.profileData;
        const iframe = document.getElementById('resin-database-iframe');
        
        if (!iframe || !iframe.contentWindow) {
            console.error('Cannot send response: iframe not found');
            return;
        }
        
        console.log('Uploading profile to local machine API...');
        
        // Convert profile data to JSON string
        const jsonString = JSON.stringify(profileData);
        
        // Create FormData for multipart upload
        const formData = new FormData();
        const blob = new Blob([jsonString], { type: 'application/json' });
        formData.append('JsonFile', blob, 'profile.json');
        
        // Make request to local machine API (same origin, no CORS issue)
        fetch('/profile/import', {
            method: 'POST',
            body: formData
        })
        .then(function(response) {
            const success = response.ok || response.status === 200 || response.status === 302;
            console.log('Upload response:', response.status, success);
            
            // Send response back to iframe
            iframe.contentWindow.postMessage(JSON.stringify({
                type: 'upload-profile-response',
                uploadId: uploadId,
                success: success,
                error: success ? null : 'Upload failed with status: ' + response.status
            }), '*');
            
            if (success) {
                // Also send upload-status message for UI updates
                iframe.contentWindow.postMessage(JSON.stringify({
                    type: 'upload-status',
                    source: 'athena-resin-db',
                    status: 'success',
                    message: 'Profile uploaded successfully',
                    profileId: profileData.id || null
                }), '*');
            }
        })
        .catch(function(error) {
            console.error('Upload error:', error);
            
            // Send error response to iframe
            iframe.contentWindow.postMessage(JSON.stringify({
                type: 'upload-profile-response',
                uploadId: uploadId,
                success: false,
                error: error.message || 'Upload failed'
            }), '*');
            
            // Also send upload-status message for UI updates
            iframe.contentWindow.postMessage(JSON.stringify({
                type: 'upload-status',
                source: 'athena-resin-db',
                status: 'error',
                message: error.message || 'Upload failed',
                profileId: profileData.id || null
            }), '*');
        });
    }
})();

