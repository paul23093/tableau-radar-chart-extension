import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import {getEncodedData} from './utils.js';

let data = [];

window.onload = async () => {
  await tableau.extensions.initializeAsync();
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
  await window.renderPlot(data);
};

function addEventListeners() {
  let worksheet = getWorksheet();
  let settings = getSettings();
  worksheet.addEventListener(tableau.TableauEventType.SummaryDataChanged, window.fetchDataAndRender);
  settings.addEventListener(tableau.TableauEventType.SettingsChanged, window.fetchDataAndRender);
  window.onresize = () => window.renderPlot(data, worksheet);
}


window.renderPlot = async function (data) {
  const container = document.getElementById('my_dataviz');
  container.innerHTML = '';

  let width = container.clientWidth;
  let height = container.clientHeight;

  let svg = d3
    .select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);


  let innerRadius = 0;
  let outerRadius = Math.min(width, height) / 2 - 40;

  let numberList = [0.2, 0.4, 0.6, 0.8, 1.0];
  let radiusList = numberList.map(r => innerRadius + (outerRadius - innerRadius) * r);

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
        .style("fill", "none")
        .attr('points', (labels) => {
            if(dataLabels.length > 0) {
              return labels.map(function(d) { return [
                r * Math.cos(2 * Math.PI / dataLabels.length * dataLabels.indexOf(d) - Math.PI / 2),
                r * Math.sin(2 * Math.PI / dataLabels.length * dataLabels.indexOf(d) - Math.PI / 2)
              ].join(","); }).join(" ");
            } else {
              const arr = [...Array(100).keys()];
              return arr.map(function(d) { return [
                r * Math.cos(2 * Math.PI / arr.length * arr.indexOf(d) - Math.PI / 2),
                r * Math.sin(2 * Math.PI / arr.length * arr.indexOf(d) - Math.PI / 2)
              ].join(","); }).join(" ");
            }
        })
  }

  svg.selectAll('g.grid')
    .data(radiusList)
    .enter().append('g')
    .each(makePolygonsGrid);


  svg.selectAll("line.direction")
    .data(dataLabels)
    .join("line")
    .style("stroke", "rgb(220, 220, 220)")
    .style("stroke-linecap", "butt")
    .style("stroke-width", 1)
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", (dataRow) => {
      return outerRadius * Math.cos(2 * Math.PI / dataLabels.length * dataLabels.indexOf(dataRow) - Math.PI / 2);
    })
    .attr("y2", (dataRow) => {
      return outerRadius * Math.sin(2 * Math.PI / dataLabels.length * dataLabels.indexOf(dataRow) - Math.PI / 2);
    });


  svg.selectAll("text.dimension")
    .data(dataLabels)
    .join("text")
    .style("alignment-baseline", "middle")
    .style("text-anchor", (dataRow) => {
      const cos = Math.cos(2 * Math.PI / dataLabels.length * dataLabels.indexOf(dataRow) - Math.PI / 2);
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
};
