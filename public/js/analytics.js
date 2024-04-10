let dplot, plot;

const ColourValues = [
    "FF0000", "00FF00", "0000FF", "FFFF00", "FF00FF", "00FFFF", "000000",
    "800000", "008000", "000080", "808000", "800080", "008080", "808080",
    "C00000", "00C000", "0000C0", "C0C000", "C000C0", "00C0C0", "C0C0C0",
    "400000", "004000", "000040", "404000", "400040", "004040", "404040",
    "200000", "002000", "000020", "202000", "200020", "002020", "202020",
    "600000", "006000", "000060", "606000", "600060", "006060", "606060",
    "A00000", "00A000", "0000A0", "A0A000", "A000A0", "00A0A0", "A0A0A0",
    "E00000", "00E000", "0000E0", "E0E000", "E000E0", "00E0E0", "E0E0E0",
];

function isNotAllNull(subArray) {
    return subArray.some(element => element !== null);
}

function renderChart(name, dataRows, series) {
    let plotHeight = $(window).height() - 300;
    if (plotHeight < 400) plotHeight = 400;
    let opts = {
        title: name,
        id: "chart1",
        class: "my-chart",
        width: $("#uplot").innerWidth(),
        height: plotHeight,
        series: series,
        axes: prepareAxis(series),
    };
    if ($("#uplot").html() != "") {
        plot.setData(dataRows);
        return;
    }
    $("#uplot").html("");
    plot = new uPlot(opts, dataRows, $("#uplot")[0]);
}

function prepareAxis(series) {
    let axes = [{}];
    for (let seriesIdx = 1; seriesIdx < series.length; seriesIdx++) {
        let scale = series[seriesIdx].scale;

        const found = axes.some(axis => axis.scale === scale);

        const decimalPlaces = determineDecimalPlaces(scale);

        if (!found && decimalPlaces !== null) {
            axes.push({
                    labelSize: 15,
                    gap: 0,
                    size: 40,
                    side: 3,
                    grid: {show: false},
                    label: scale,
                    scale: scale,
                    values: (self, ticks) => ticks.map(rawValue => rawValue.toFixed(decimalPlaces)),
                }
            )
        }
    }

    let halfOfAxisCount = parseInt(axes.length / 2) + 1;
    for (let j = halfOfAxisCount; j < axes.length; j++) {
        axes[j].side = 1;
    }
    axes[1].grid.show = true;
    return axes;
}

function determineDecimalPlaces(scale) {
    let zeroPlaceScales = ["px", "Pressure"];
    let onePlaceScales = ["s", "mm", "°C"];

    if (zeroPlaceScales.includes(scale)) {
        return 0;
    } else if (onePlaceScales.includes(scale)) {
        return 1;
    } else {
        return null;
    }
}

function aggregateFunc(v, aggregate) {
    let val = parseFloat(v / 1000000000);
    if (aggregate == 0) return val;
    return Math.round(val / aggregate) * aggregate;
}

function getSeries() {
    let series = [{}];
    $("#uplot").data("axes").forEach((element, key) => {
        series.push({
            show: true,
            spanGaps: true,
            label: element.Name,
            scale: element.Type,
            value: (self, rawValue) => (rawValue != null ? rawValue.toFixed(element.Decimal) + element.Type : ""),
            stroke: "#" + ColourValues[key] + "88",
            width: 1,
        });
    });
    return series;
}

function downloadCSV(series, o) {
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    let p = "";
    for (j = 0; j < series.length; j++) {
        if (j == 0) {
            p += "Timestamp,";
        } else {
            p += series[j].label + ",";
        }
    }
    p += "\n\r";
    let iT = o.length;
    let jT = o[0].length
    for (j = 0; j < jT; j++) {
        for (i = 0; i < iT; i++) {
            if (o[i][j] === null) p += ",";
            else p += o[i][j] + ",";
        }
        p += "\n\r";
    }
    const blob = new Blob([p], {type: "octet/stream"}),
        url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = "nanodlp.csv";
    a.click();
    window.URL.revokeObjectURL(url);
}

const processData = (dataResponse) => {
    let previousAggregateValue;
    const series = getSeries();
    const processedData = series.map(() => []);
    let dataPointIndex = 0;

    dataResponse
        .filter(i => i['ID'])
        .forEach(responseItem => {
            const currentAggregateValue = aggregateFunc(responseItem['ID'], 0);
            if (currentAggregateValue != previousAggregateValue) {
                for (let j = 0; j < series.length; j++) {
                    processedData[j][dataPointIndex] = null;
                }
                processedData[0][dataPointIndex] = currentAggregateValue;
                previousAggregateValue = currentAggregateValue;
                dataPointIndex++;
            }

            processedData[responseItem['T'] + 1][dataPointIndex - 1] = responseItem['V'];
        })

    return processedData
}

/**
 * Iterates through a uplot dataset and backfills any null values where possible with the last non-null element for that
 * series. Avoiding null datapoints in uplot allows the legend to work better by showing less blank values.
 *
 * If no last non-null element exists, it will keep the null.
 *
 * @param data - An array of arrays of elements for the chart. All inner arrays should be equal length.
 */
const backFillData = (data) => {
    return data.map(serie => {
        // starting from index 1 because the first item won't have a previous element to pull from
        for (let serieElemIdx = 1; serieElemIdx < serie.length; serieElemIdx++) {

            const serieElem = serie[serieElemIdx];
            if (serieElem !== null) {
                continue;
            }

            serie[serieElemIdx] = serie[serieElemIdx - 1];
        }
        return serie;
    });
}


function buildChartFromData(name, dataResponse, exp) {
    if (dataResponse.length === 0) {
        return;
    }

    const series = getSeries();
    const processedData = processData(dataResponse);
    const filteredData = processedData.filter(isNotAllNull);
    const backFilledData = backFillData(filteredData);
    const filteredSeries = series.filter((_, index) => isNotAllNull(processedData[index]));


    if (JSON.stringify(dplot) == JSON.stringify(dataResponse) && !exp) {
        return
    }
    dplot = dataResponse;


    if (exp) return downloadCSV(filteredSeries, backFilledData);
    renderChart(name, backFilledData, filteredSeries);
}