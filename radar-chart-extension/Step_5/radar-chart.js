import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import {calculateFogColor, getEncodedData} from './utils.js';

let data = [];

let selectedTupleIds = new Set();
let hoveredTupleId;
const defaultIntervalInMin = '5';

let pointsArea;
let points;

function configure() {
  const popupUrl = 'radar-chart-dialog.html';
  tableau.extensions.ui.displayDialogAsync(popupUrl, defaultIntervalInMin, { height: 400, width: 500 }).then(async (_) => {
    await import('./radar-chart.js?timestamp=' + performance.now()).then(fetchDataAndRender());
  }).catch((error) => {
    switch(error.errorCode) {
      case tableau.ErrorCodes.DialogClosedByUser:
        console.log("Dialog was closed by user");
        break;
      default:
      console.error(error.message);
    }
  });
}

window.onload = async () => {
  await tableau.extensions.initializeAsync({'configure': configure});
  window.fetchDataAndRender();
  addEventListeners();
};

function getWorksheet() {
  return tableau.extensions.worksheetContent.worksheet;
}

function getSettings() {
  return tableau.extensions.settings;
}

window.fetchDataAndRender = async function () {
  let worksheet = getWorksheet();
  data = await getEncodedData(worksheet);
  console.log(data);
  window.renderBarplot(data);
};

function addEventListeners() {
  let worksheet = getWorksheet();
  let settings = getSettings();

  worksheet.addEventListener(tableau.TableauEventType.SummaryDataChanged, window.fetchDataAndRender);
  settings.addEventListener(tableau.TableauEventType.SettingsChanged, window.fetchDataAndRender);

  window.onresize = () => window.renderBarplot(data, worksheet);
}

window.renderBarplot = async function (data) {
  //
  // Initialize variables
  //
  const container = document.getElementById('my_dataviz');
  container.innerHTML = '';

  let worksheet = getWorksheet();

  let width = container.clientWidth;
  let height = container.clientHeight;

  let innerRadius = 0;
  let outerRadius = Math.min(width, height) / 2 - 40; // the outerRadius goes from the middle of the SVG area to the border

  let numberList = [0.2, 0.4, 0.6, 0.8, 1.0];
  let radiusList = numberList.map(n => innerRadius + (outerRadius - innerRadius) * n);

  let tupleIds = data.map((dataRow) => dataRow.$tupleId);

  let maxHeight = d3.max(data, (dataRow) => (dataRow.values ? dataRow.values[0].value : 0));
  let minHeight = d3.min(data, (dataRow) => (dataRow.values ? dataRow.values[0].value : 0));

  let angleScale = d3
    .scaleBand()
    .range([0, 2 * Math.PI])
    .domain(tupleIds); // The domain of the X axis is the list of tuples

  let heightScale = d3
    .scaleRadial()
    .range([innerRadius + 10, outerRadius])
    .domain([minHeight, maxHeight]); // Domain of Y is from 0 to the max seen in the data

  let colorScale = d3.scaleOrdinal(d3.schemeTableau10);
  let getColor = (dataRow) => {
    let color = (data.length>0 && dataRow.color) ? colorScale(dataRow.color[0].value) : "#4e79a7";

    if (selectedTupleIds.size > 0 && !selectedTupleIds.has(dataRow.$tupleId)) {
      color = calculateFogColor(color);
    }

    return color;
  };

  //
  // Append the SVG object to the body of the page
  //
  let svg = d3
    .select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);


  const dataDetails = (data.length>0 && data[0].detail) ? data.map(d => d.detail[0].value).filter((value, index, array) => array.indexOf(value) === index) : data;
  let groupedDataByDetails = [];
  dataDetails.forEach((detail) => {
    groupedDataByDetails.push((data.length>0 && data[0].detail)
        ? data.filter((value, index, array) => value.detail[0].value === detail)
        : detail
    );
  });
  groupedDataByDetails = (data.length>0 && data[0].detail) ? groupedDataByDetails : [groupedDataByDetails];


  const dataColors = (data.length>0 && data[0].color) ? data.map(d => d.color[0].value).filter((value, index, array) => array.indexOf(value) === index) : data;
  let groupedDataByColors = [];
  dataColors.forEach((color) => {
    groupedDataByColors.push((data.length>0 && data[0].color)
        ? data.filter((value, index, array) => value.color[0].value === color)
        : color
    );
  });
  groupedDataByColors = (data.length>0 && data[0].color) ? groupedDataByColors : [groupedDataByColors];

  const dataLabels = data.map(d => d.axes[0]).reduce((acc, curr) => {
    const exists = acc.some(el => el['value'] === curr['value']);
    return exists ? acc : [...acc, curr];
  }, []);

  function makePolygonsGrid(r) {
    d3.select(this).selectAll('polygon.grid')
        .data([dataLabels])
        .enter().append('polygon')
        .style("stroke", "rgb(220, 220, 220)")
        .style("stroke-width", 1)
        // .style("stroke-dasharray", "5,5")
        .style("fill", "none")
        .attr('points', (labels) => {
            if(dataLabels.length > 0) {
              return labels.map(function(d) { return [r * Math.cos(2 * Math.PI / dataLabels.length * dataLabels.indexOf(d) - Math.PI / 2), r * Math.sin(2 * Math.PI / dataLabels.length * dataLabels.indexOf(d) - Math.PI / 2)].join(","); }).join(" ");
            } else {
              const arr = [...Array(100).keys()];
              return arr.map(function(d) { return [r * Math.cos(2 * Math.PI / arr.length * arr.indexOf(d) - Math.PI / 2), r * Math.sin(2 * Math.PI / arr.length * arr.indexOf(d) - Math.PI / 2)].join(","); }).join(" ");
            }
        })
  }

  let groups = svg.selectAll('g.grid')
    .data(radiusList)
    .enter().append('g')
    .each(makePolygonsGrid);


  let lines = svg
    .selectAll("line.direction")
    .data(dataLabels)
    .join("line")
    .style("stroke", "rgb(220, 220, 220)")
    .style("stroke-linecap", "butt")
    // .style("stroke-dasharray", "5,5")
    .style("stroke-width", 1)
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", (dataRow) => {
      return outerRadius * Math.cos(2 * Math.PI / dataLabels.length * dataLabels.indexOf(dataRow) - Math.PI / 2);
    })
    .attr("y2", (dataRow) => {
      return outerRadius * Math.sin(2 * Math.PI / dataLabels.length * dataLabels.indexOf(dataRow) - Math.PI / 2);
    });


  let dimLabels = svg
    .selectAll("text.dimension")
    .data(dataLabels)
    .join("text")
    .style("alignment-baseline", "middle")
    .style("text-anchor", (dataRow) => {
      const cos = Math.cos(2 * Math.PI / dataLabels.length * dataLabels.indexOf(dataRow) - Math.PI / 2);
      const sin = Math.sin(2 * Math.PI / dataLabels.length * dataLabels.indexOf(dataRow) - Math.PI / 2);
      if (cos > 0.00001) {
        return "start";
      } else if (cos < -0.00001) {
        return "end";
      } else {
        return "middle";
      }
    })
    .style("font-size", () => {
      return tableau.extensions.settings.get("labelsFontSize") ?? 14;
    })
    .attr("x", (dataRow) => {
      return (outerRadius + 30) * Math.cos(2 * Math.PI / dataLabels.length * dataLabels.indexOf(dataRow) - Math.PI / 2);
    })
    .attr("y", (dataRow) => {
      return (outerRadius + 30) * Math.sin(2 * Math.PI / dataLabels.length * dataLabels.indexOf(dataRow) - Math.PI / 2);
    })
    .text(dataRow => dataRow.formattedValue);


  function drawPolygon(detail) {
    d3.select(this).selectAll("polygon.area")
    .data([detail])
    .enter().append('polygon')
    .style("stroke", (d) => getColor(d[0]))
    .style("stroke-opacity", .8)
    .style("stroke-width", 2)
    // .style("fill", () => tableau.extensions.settings.get("areaColor"))
    .style("fill", (d) => getColor(d[0]))
    .style("fill-opacity", .2)
    .attr("points", function(d) {
        return d.map(function(d) {
          const radius = (innerRadius + (outerRadius - innerRadius) * d.values[0].value);
          return [
            radius * Math.cos(2 * Math.PI / detail.length * detail.indexOf(d) - Math.PI / 2),
            radius * Math.sin(2 * Math.PI / detail.length * detail.indexOf(d) - Math.PI / 2)
          ].join(","); }).join(" ");
    });
  }


  function drawValueLabels(detail) {
    d3.select(this).selectAll("text.value")
    .data(detail)
    .join('text')
    .style("alignment-baseline", "middle")
    .style("text-anchor", (dataRow) => {
      const cos = Math.cos(2 * Math.PI / detail.length * detail.indexOf(dataRow) - Math.PI / 2);
      const sin = Math.sin(2 * Math.PI / detail.length * detail.indexOf(dataRow) - Math.PI / 2);
      if (cos > 0.00001) {
        return "start";
      } else if (cos < -0.00001) {
        return "end";
      } else {
        return "middle";
      }
    })
    .style("font-size", () => {
      return tableau.extensions.settings.get("valuesFontSize") ?? 14;
    })
    .attr("x", (dataRow) => {
      const radius = (innerRadius + (outerRadius - innerRadius) * dataRow.values[0].value) + 15;
      return radius * Math.cos(2 * Math.PI / detail.length * detail.indexOf(dataRow) - Math.PI / 2);
    })
    .attr("y", (dataRow) => {
      const radius = (innerRadius + (outerRadius - innerRadius) * dataRow.values[0].value) + 15;
      return radius * Math.sin(2 * Math.PI / detail.length * detail.indexOf(dataRow) - Math.PI / 2);
    })
    .text(dataRow => dataRow.values[0].formattedValue);
  }


  function drawValuePoints(detail) {
    points = d3.select(this).selectAll('circle.metric')
    .data(detail)
    .join('circle')
    .style("alignment-baseline", "middle")
    .style("fill", (d) => getColor(d))
    .attr("r", 4)
    .attr("cx", dataRow => {
      const radius = (innerRadius + (outerRadius - innerRadius) * dataRow.values[0].value);
      return radius * Math.cos(2 * Math.PI / detail.length * detail.indexOf(dataRow) - Math.PI / 2);
    })
    .attr("cy", dataRow => {
      const radius = (innerRadius + (outerRadius - innerRadius) * dataRow.values[0].value);
      return radius * Math.sin(2 * Math.PI / detail.length * detail.indexOf(dataRow) - Math.PI / 2);
    });

    pointsArea = d3.select(this).selectAll("circle.metric-area")
    .data(detail)
    .join("circle")
    .style("fill", "black")
    .style("fill-opacity", 0)
    .attr("r", 30)
    .attr("cx", dataRow => {
      const radius = (innerRadius + (outerRadius - innerRadius) * dataRow.values[0].value);
      return radius * Math.cos(2 * Math.PI / detail.length * detail.indexOf(dataRow) - Math.PI / 2);
    })
    .attr("cy", dataRow => {
      const radius = (innerRadius + (outerRadius - innerRadius) * dataRow.values[0].value);
      return radius * Math.sin(2 * Math.PI / detail.length * detail.indexOf(dataRow) - Math.PI / 2);
    });
  }


  if (data.length>0 && data[0].color) {
    let polygons = svg.selectAll('g.areas')
      .data(groupedDataByColors)
      .enter().append('g')
      .each(drawPolygon);

    let valuePoints = svg.selectAll('g.labels')
      .data(groupedDataByColors)
      .enter().append('g')
      .each(drawValuePoints);

    let valueLabels = svg.selectAll('g.labels')
      .data(groupedDataByColors)
      .enter().append('g')
      .each(drawValueLabels);
  } else {
    let polygons = svg.selectAll('g.areas')
      .data(groupedDataByDetails)
      .enter().append('g')
      .each(drawPolygon);

    let valuePoints = svg.selectAll('g.labels')
      .data(groupedDataByDetails)
      .enter().append('g')
      .each(drawValuePoints);

    let valueLabels = svg.selectAll('g.labels')
      .data(groupedDataByDetails)
      .enter().append('g')
      .each(drawValueLabels);
  }

  // let pointsArea = svg
  //   .selectAll("circle.metric-area")
  //   .data(data)
  //   .join("circle")
  //   .style("fill", "black")
  //   .style("fill-opacity", 0)
  //   .attr("r", 30)
  //   .attr("cx", dataRow => {
  //     const radius = (innerRadius + (outerRadius - innerRadius) * dataRow.value[0].value);
  //     return radius * Math.cos(2 * Math.PI / data.length * data.indexOf(dataRow) - Math.PI / 2);
  //   })
  //   .attr("cy", dataRow => {
  //     const radius = (innerRadius + (outerRadius - innerRadius) * dataRow.value[0].value);
  //     return radius * Math.sin(2 * Math.PI / data.length * data.indexOf(dataRow) - Math.PI / 2);
  //   })


  function updateBarColors(bars) {
    bars
      .attr('fill', 'none')
      // .attr('fill', getColor)
      .attr('stroke', 'black')
      .attr('stroke-width', (dataRow) => (selectedTupleIds.has(dataRow.$tupleId) ? 2 : hoveredTupleId === dataRow.$tupleId ? 1 : 0))
      .attr('cursor', 'pointer');
  }


  function setCursor(bars, cursorType) {
    bars
      .attr('cursor', cursorType);
  }


  pointsArea
    .on('mousemove', (e, dataRow) => {
      hoveredTupleId = dataRow.$tupleId;
      pointsArea
        .attr('cursor', 'pointer')
      points
        .attr('r', (dataRow) => (hoveredTupleId === dataRow.$tupleId ? 6 : 4))
        .attr('stroke', 'black')
        .attr('stroke-width', (dataRow) => (selectedTupleIds.has(dataRow.$tupleId) ? 2 : 0));
      worksheet.hoverTupleAsync(dataRow.$tupleId, { tooltipAnchorPoint: { x: e.x, y: e.y } });
    })
    .on('mouseout', () => {
      hoveredTupleId = undefined;
      pointsArea
        .attr('cursor', 'default')
      points
        .attr('r', 4)
        .attr('stroke', 'black')
        .attr('stroke-width', (dataRow) => (selectedTupleIds.has(dataRow.$tupleId) ? 2 : hoveredTupleId === dataRow.$tupleId ? 2 : 0));
      worksheet.hoverTupleAsync(null);
    })
  .on('click', (e, dataRow) => {
      let selectOption = tableau.SelectOptions.Simple;
      if (e.ctrlKey || e.metaKey) {
        if (selectedTupleIds.has(dataRow.$tupleId)) selectedTupleIds.delete(dataRow.$tupleId);
        else selectedTupleIds.add(dataRow.$tupleId);
        selectOption = tableau.SelectOptions.Toggle;
      } else {
        if (selectedTupleIds.has(dataRow.$tupleId)) selectedTupleIds.clear();
        else {
          selectedTupleIds.clear();
          selectedTupleIds.add(dataRow.$tupleId);
        }
      }

      points
        .attr('r', (dataRow) => (selectedTupleIds.has(dataRow.$tupleId) ? hoveredTupleId === dataRow.$tupleId ? 6 : 4 : 4))
        .attr('stroke', 'black')
        .attr('stroke-width', (dataRow) => (selectedTupleIds.has(dataRow.$tupleId) ? 2 : hoveredTupleId === dataRow.$tupleId ? 2 : 0));

      worksheet.selectTuplesAsync([dataRow.$tupleId], selectOption, { tooltipAnchorPoint: { x: e.x, y: e.y } });
      e.stopPropagation();
    });


  window.onclick = () => {
    hoveredTupleId = undefined;
    selectedTupleIds = new Set();
    points
        .attr('r', 4)
        .attr('stroke', 'black')
        .attr('stroke-width', 0);
    worksheet.hoverTupleAsync(null);
  };

  window.onkeydown = (e) => {
   switch (e.code) {
    case 'IntlBackslash':
      configure();
      break;

    case 'Tab':
    case 'Escape':
      hoveredTupleId = undefined;
      worksheet.leaveMarkNavigationAsync();
   }


    // Tableau Extensions API Call:
    // Tell tableau to show the tooltip (if a mark is selected)
    if (hoveredTupleId) {
      worksheet.hoverTupleAsync(hoveredTupleId, {
        tooltipAnchorPoint: { x: document.body.clientWidth / 2, y: document.body.clientHeight / 2 },
      });
    } else worksheet.hoverTupleAsync(null);
  };

  window.onblur = () => {
    hoveredTupleId = undefined;
    selectedTupleIds = new Set();
    // Tableau Extensions API Call:
    // Tell tableau to return focus to the main viz
    // worksheet.leaveMarkNavigationAsync();

    // Tableau Extensions API Call:
    // Tell tableau to hide the tooltip
    worksheet.hoverTupleAsync(null);
  };
};
