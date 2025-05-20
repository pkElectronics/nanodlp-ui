let cachedData;

let uplots = [];

// Used primarily for pausing the chart auto-update on zoom
let isZoomed = false;

const LOCAL_STORAGE_KEY = "legends:v2";

const ANALYTICS_UPDATE_INTERVAL = 1000;

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



/**
 * When adding new values to the chart on the backend, add the ID from the data endpoint and the key from the NanoDLP axes into this
 */
const CHART_CONFIG = {
    chart1: {
        uplotId: '#uplot-1',
        fields: [
            { key: 'LayerHeight', id: 0 },
            { key: 'SolidArea', id: 1 },
            { key: 'AreaCount', id: 2 },
            { key: 'LargestArea', id: 3 },
            { key: 'Speed', id: 4 },
            { key: 'Cure', id: 5 },
            { key: 'Pressure', id: 6, overrideLabel: 'Force', overrideAxisLabel: 'Force', overrideUnit: 'g' },
            { key: 'LayerTime', id: 9 },
            { key: 'LiftHeight', id: 10 },
            { key: 'DynamicWait', id: 17 },

        ]
    },
    chart2: {
        uplotId: '#uplot-2',
        fields: [
            { key: 'TemperatureInside', id: 7 },
            { key: 'TemperatureOutside', id: 8 },
            { key: 'TemperatureMCU', id: 11 },
            { key: 'TemperatureInsideTarget', id: 12 },
            { key: 'TemperatureOutsideTarget', id: 13 },
            { key: 'TemperatureMCUTarget', id: 14 },
            { key: 'MCUFanRPM', id: 15 },
            { key: 'UVFanRPM', id: 16 },
            { key: 'TemperatureVat', id: 18 },
            { key: 'TemperatureVatTarget', id: 19 },
            { key: 'PTCFanRPM', id: 20 },
            { key: 'AEGISFanRPM', id: 21 },
            { key: 'TemperatureChamber', id: 22 },
            { key: 'TemperatureChamberTarget', id: 23 },
            { key: 'TemperaturePTC', id: 24 },
            { key: 'TemperaturePTCTarget', id: 25 },
            { key: 'VOCInlet', id: 26 },
            { key: 'VOCOutlet', id: 27 },
        ]
    },
}

const ALL_CHART_CONFIG = Object.keys(CHART_CONFIG).flatMap(key => CHART_CONFIG[key].fields);

function isNotAllNull(subArray) {
    return subArray.some(element => element !== null);
}

function renderChart(name, dataRows, series, uplotId, chartStyle) {
    const $uplot = $(`#${uplotId}`);

    if (dataRows.length <= 1) return;

    let plotHeight = chartStyle?.height ?? 400;
    const axes = prepareAxis(series);
    let opts = {
        title: name,
        class: "my-chart",
        width: $uplot.width(),
        height: plotHeight,
        series: series,
        axes: axes,
        cursor: {
            sync: {
                key: 'chartCursorSync'
            }
        },
        hooks: {
            setSelect: [
                _ => {
                    // Chart has been zoomed in
                    isZoomed = true;
                    $('#chart-paused-warning').show()
                }
            ],
            setScale: [
                (u, scale) => {
                    // hack to determine if zoom has been reset, see https://github.com/leeoniya/uPlot/issues/565
                    if (scale === 'x') {
                        const { min, max } = u.scales.x;
                        const xData = u.data[0];

                        if (min === xData[0] && max === xData[xData.length - 1]) {
                            isZoomed = false
                            $('#chart-paused-warning').hide()
                        }
                    }
                }
            ]
        }
    };

    if (isZoomed) {
        return;
    }

    const plotToUpdate = uplots.find(plot => plot.id === uplotId);
    if (plotToUpdate && plotToUpdate.seriesLength === series.length) {

        // Chart already exists, update the data and return so we don't rebuilt the whole HTML
        plotToUpdate.uplot.setData(dataRows);
        return;
    }

    $uplot.html('');
    opts = applyLegend(opts, uplotId);
    const newUplot = new uPlot(opts, dataRows, $uplot[0]);

    let newUplotReference = { id: uplotId, uplot: newUplot, seriesLength: series.length };
    if (plotToUpdate && plotToUpdate.seriesLength !== series.length) {
        // This was a legend update trigger so we want to set our uplot reference with the new series length
        uplots = uplots.map(uplot => uplot.id === plotToUpdate.id ? newUplotReference : uplot)
    } else {
        // This was the initial build and we want to create the reference in the uplot list
       uplots.push(newUplotReference);
    }
}

function applyLegend(opts, uplotId) {
    const storedString = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!storedString) return opts;
    const series = JSON.parse(storedString);
    series[uplotId].forEach((element,index) => {
        if (element.show === false && opts.series[index] !== undefined) opts.series[index].show = false;
    });
    return opts
}

function addSaveLegendHandler() {
    $(".u-legend .u-series").click(function () {
        const cacheData = uplots.reduce((acc, uplot) => {
            return {...acc, [uplot.id]: uplot.uplot.series};
        }, {});
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cacheData));
    });
}

function prepareAxis(series) {
    let axes = [{}];
    for (let seriesIdx = 1; seriesIdx < series.length; seriesIdx++) {
        const serie = series[seriesIdx];
        let scale = serie.scale;

        const found = axes.some(axis => axis.scale === scale);

        const decimalPlaces = determineDecimalPlaces(scale);

        if (!found && decimalPlaces !== null) {
            const config = ALL_CHART_CONFIG.find(config => config.key === serie.key);
            const label = config?.overrideAxisLabel ?? scale;
            axes.push({
                    labelSize: 15,
                    gap: 0,
                    size: 40,
                    side: 3,
                    grid: {show: false},
                    label,
                    scale,
                    values: (self, ticks) => ticks.map(rawValue => rawValue.toFixed(decimalPlaces)),
                }
            )
        }
    }

    let halfOfAxisCount = parseInt(axes.length / 2) + 1;
    for (let j = halfOfAxisCount; j < axes.length; j++) {
        axes[j].side = 1;
    }
    if (axes[1]) {
        axes[1].grid.show = true;
    }
    return axes;
}

function determineDecimalPlaces(scale) {
    let zeroPlaceScales = ["px", "Pressure", "RPM"];
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

function getSeries(axes) {
    let fmt = uPlot.fmtDate("{HH}:{mm}:{ss}");
    let series = [{value: (self, ts) => ts !== null ? fmt(new Date(ts * 1000)) : '--'}];


    axes.forEach((element, key) => {
        const config = ALL_CHART_CONFIG.find(config => config.key === element.Key);
        const label = config?.overrideLabel ?? element.Name;
        const unit = config?.overrideUnit ?? element.Type;
        series.push({
            key: element.Key,
            show: true,
            spanGaps: true,
            label,
            scale: element.Type,
            value: (self, rawValue) => (rawValue != null ? rawValue.toFixed(element.Decimal) + unit : ""),
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

const processData = (dataResponse, series) => {
    let previousAggregateValue;
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


function buildChartFromData(name, dataResponse, exp, axes, chartStyle) {
    if (dataResponse.length === 0) {
        return;
    }

    const series = getSeries(axes);
    const processedData = processData(dataResponse, series);
    const backFilledData = backFillData(processedData);

    if (JSON.stringify(cachedData) === JSON.stringify(dataResponse) && !exp) {
        // exit if data hasn't changed from last time
        return
    }
    cachedData = dataResponse;

    if (exp) return downloadCSV(series, backFilledData);
    renderSplitChart(series, backFilledData, CHART_CONFIG.chart1, "uplot-1", chartStyle);
    renderSplitChart(series, backFilledData, CHART_CONFIG.chart2, "uplot-2", chartStyle);

    addSaveLegendHandler()
}

function renderSplitChart(series, backFilledData, chartConfig, uplotId, chartStyle) {
    const backFilledDataForChart = backFilledData.filter((dataSeries, idx) => idx === 0 || chartConfig.fields.some(conf => conf.id + 1 === idx))
    const dataWithoutNulls = backFilledDataForChart.filter(isNotAllNull);

    const seriesForChart = series.filter((i, idx) => idx === 0 || chartConfig.fields.some((conf) => conf.key === i.key) )
    const seriesWithoutNulls = seriesForChart.filter((_, index) => isNotAllNull(backFilledDataForChart[index]));

    renderChart(name, dataWithoutNulls, seriesWithoutNulls, uplotId, chartStyle);
}