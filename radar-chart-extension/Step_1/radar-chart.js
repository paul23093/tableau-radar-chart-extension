import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import {getEncodedData} from "./utils.js";

let data = [];

window.onload = async () => {
  await tableau.extensions.initializeAsync();
  window.fetchDataAndRender();
  addEventListeners();
};

function getWorksheet() {
  return tableau.extensions.worksheetContent.worksheet;
}

window.fetchDataAndRender = async function () {
  let worksheet = getWorksheet();
  data = await getEncodedData(worksheet);
  window.renderPlot(data);
};

function addEventListeners() {
  let worksheet = getWorksheet();
  worksheet.addEventListener(tableau.TableauEventType.SummaryDataChanged, window.fetchDataAndRender);
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

  svg.selectAll("text")
    .data(['Hello Cyprus TUG'])
    .join("text")
    .style("alignment-baseline", "middle")
    .style("text-anchor", "middle")
    .style("font-size", 40)
    .style("color", "rgb(100, 100, 100)")
    .attr("x", 0)
    .attr("y", 0)
    .text((t) => t);
}


