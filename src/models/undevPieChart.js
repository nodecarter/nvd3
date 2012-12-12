
nv.models.undevPieChart = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0}
    , width = null
    , height = null
    , getValues = function(d) { return d.values }
    , getX = function(d) { return d.x }
    , getY = function(d) { return d.y }
    , getLabel = function(d) { return d.label }
    , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
    , color = nv.utils.defaultColor()
    , valueFormat = d3.format('p')
    , showLabels = true
    , donutLabelsOutside = false
    , labelThreshold = .04 //if slice percentage is under this, don't show label
    , donut = true
    , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout')
    , showHints = true
    , d3_svg_arcOffset = -Math.PI / 2
    ;

  //============================================================

  function chart(selection) {
    selection.each(function(data) {
      var container = d3.select(this),
          that = this;

      var availableWidth = (width  || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom,
          radius = Math.min(availableWidth, availableHeight) / 2;

      chart.update = function() { chart(selection); };

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('.nv-wrap.nv-pie').data([getValues(data[0])]);
      var wrapEnter = wrap.enter().append('g').attr('class','nvd3 nv-wrap nv-pie nv-chart-' + id);
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g');

      gEnter.append('g').attr('class', 'nv-pie');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
      g.select('.nv-pie').attr('transform', 'translate(' + availableWidth / 2 + ',' + availableHeight / 2 + ')');

      //------------------------------------------------------------

      // add check box to toggle hints
      var toggleHintLabel = d3.select(this.parentNode)
        .selectAll('label.nv-toggle-hints').data([0]).enter()
          .insert("label", "svg")
            .attr("class", "nv-toggle-hints")
            .text("Show all hints");
      var toggleHintCheckBox = toggleHintLabel
        .selectAll("input.nv-toggle-hints").data([0]).enter()
          .insert("input")
            .attr("class", "nv-toggle-hints")
            .attr("type", "checkbox");

      toggleHintCheckBox.on("change", function() {
        d3.select(this.parentNode.parentNode).selectAll('.nv-hint')
          .classed('always-visible', this.checked);
      });

      container
          .on('click', function(d,i) {
              dispatch.chartClick({
                  data: d,
                  index: i,
                  pos: d3.event,
                  id: id
              });
          });


      var arc = d3.svg.arc()
                  .outerRadius((radius-(radius / 5)));

      if (donut) arc.innerRadius(radius / 2);


      // Setup the Pie chart and choose the data element
      var pie = d3.layout.pie()
          .sort(null)
          .value(function(d) { return d.disabled ? 0 : getY(d) });

      var slices = wrap.select('.nv-pie').selectAll('.nv-slice')
          .data(pie);

      slices.exit().remove();

      var ae = slices.enter().append('g')
              .attr('class', 'nv-slice')
              .on('mouseover', function(d,i){
                d3.select(this).classed('hover', true);
                dispatch.elementMouseover({
                    label: getX(d.data),
                    value: getY(d.data),
                    point: d.data,
                    pointIndex: i,
                    pos: [d3.event.pageX, d3.event.pageY],
                    id: id
                });
              })
              .on('mouseout', function(d,i){
                d3.select(this).classed('hover', false);
                dispatch.elementMouseout({
                    label: getX(d.data),
                    value: getY(d.data),
                    point: d.data,
                    index: i,
                    id: id
                });
              })
              .on('click', function(d,i) {
                dispatch.elementClick({
                    label: getX(d.data),
                    value: getY(d.data),
                    point: d.data,
                    index: i,
                    pos: d3.event,
                    id: id
                });
                d3.event.stopPropagation();
              })
              .on('dblclick', function(d,i) {
                dispatch.elementDblClick({
                    label: getX(d.data),
                    value: getY(d.data),
                    point: d.data,
                    index: i,
                    pos: d3.event,
                    id: id
                });
                d3.event.stopPropagation();
              });

        slices
            .attr('fill', function(d,i) { return color(d, i); })
            .attr('stroke', function(d,i) { return color(d, i); });

        var paths = ae.append('path')
            .each(function(d) { this._current = d; });
            //.attr('d', arc);

        d3.transition(slices.select('path'))
            .attr('d', arc)
            .attrTween('d', arcTween);

        function midAngle(d) {
          var a = (d.startAngle + d.endAngle) / 2 + d3_svg_arcOffset;
          return a;
        }

        function isLeftSide(d) {
          return Math.cos(midAngle(d)) < 0;
        }

        if (showLabels) {
          // This does the normal label
          var labelsArc = arc;
          if (donutLabelsOutside) {
            labelsArc = d3.svg.arc().outerRadius(arc.outerRadius())
          }

          ae.append("g").classed("nv-label", true)
            .each(function(d, i) {
              var group = d3.select(this);

              group.append('rect')
                  .style('stroke', '#fff')
                  .style('fill', '#fff')
                  .attr("rx", 3)
                  .attr("ry", 3);

              group.append('text')
                  .attr("dy", 3)
                  .style('text-anchor', 'middle') //center the text on it's origin
                  .style('fill', '#000')


          });

          slices.select(".nv-label").transition()
            .attr('transform', function(d) {
                d.outerRadius = radius + 10; // Set Outer Coordinate
                d.innerRadius = radius + 15; // Set Inner Coordinate
                var rotateBy = midAngle(d) * 180 / Math.PI;
                if (isLeftSide(d)) {
                  rotateBy = rotateBy + 180;
                }
                return 'translate(' + labelsArc.centroid(d) + ') ' +
                       'rotate(' + rotateBy + ')';
            });

          var rectMargin = 2;

          slices.each(function(d, i) {
            var slice = d3.select(this);
            var percent = (d.endAngle - d.startAngle) / (2 * Math.PI);
            var showLabel = d.value && percent > labelThreshold;
            var label = (percent * 100).toFixed(2) + "%";
            slice
              .select(".nv-label text")
                .text(showLabel ? label : '');

            var textBox = slice.select('text').node().getBBox();
            slice.select(".nv-label rect")
              .attr("width", textBox.width + rectMargin * 2)
              .attr("height", textBox.height + rectMargin * 2)
              .attr("transform", function() {
                return "translate(" + [textBox.x - rectMargin, textBox.y - rectMargin] + ")";
              })
              .style("fill-opacity", showLabel ? 1 : 0);
          });
        }

        if (showHints) {
          // This does the hints
          var outerRadius = (radius-(radius / 5)),
              hintMargin = 5,
              hintValueHeight = radius * 0.15,
              hintsStartR = outerRadius,
              hintsControlPointR1 = outerRadius * 1.3,
              hintsControlPointR2 = outerRadius * 1.4,
              hintsEndR = outerRadius * 1.5,
              hintsLeftDomain = [],
              hintsRightDomain = [],
              sumY = 0;

          slices.each(function(d,i) {
            if (isLeftSide(d)) {
              hintsLeftDomain.push(i);
            } else {
              hintsRightDomain.push(i);
            }
            sumY = sumY + getY(d.data);
          });

          var bound = availableHeight / 2 - hintMargin

          var hintsLeftScale = d3.scale.ordinal()
            .domain(hintsLeftDomain)
            .rangePoints([bound, -bound]);

          var hintsRightScale = d3.scale.ordinal()
            .domain(hintsRightDomain)
            .rangePoints([-bound, bound]);

          var hintLine = d3.svg.line()
              .x(function(d, i) { return d.x; })
              .y(function(d, i) { return d.y; })
              .interpolate("basis");

          function hintLineData(d, i) {
            // point 0 - pie edge
            var points = [];
            points.push({
              "x": hintsStartR * Math.cos(midAngle(d)),
              "y": hintsStartR * Math.sin(midAngle(d))
            });
            // point 1 - bezier control point 1
            points.push({
              "x": hintsControlPointR1 * Math.cos(midAngle(d)),
              "y": hintsControlPointR1 * Math.sin(midAngle(d))
            });
            // point 2 - bezier control point 2
            points.push( isLeftSide(d) ?
              { "x": -hintsControlPointR2, "y": hintsLeftScale(i) } :
              // { "x": -hintsControlPointR2, "y": 0 } :
              { "x": hintsControlPointR2, "y": hintsRightScale(i) }
            );
            // point 3 - near hint
            points.push( isLeftSide(d) ?
              { "x": -hintsEndR, "y": hintsLeftScale(i) } :
              // { "x": -hintsEndR, "y": 0 } :
              { "x": hintsEndR, "y": hintsRightScale(i) }
            );
            return points;
          }

          slices.each(function(d,i) {
            var hintGroup = d3.select(this).selectAll(".nv-hint")
              .data([0]).enter()
                .append("g")
                  .attr("class", "nv-hint");

            // reference line to hint label
            hintGroup.append("path")
                  .attr("class", "nv-hint-line")
                  .attr("d", hintLine(hintLineData(d, i)))
                  .style("stroke", color(d, i))
                  .style("stroke-width", 2)
                  .style("fill", "none");

            // hint label
            hintGroup.append("text")
              .attr("transform", function() {
                var p = hintLineData(d, i).pop();
                var x = isLeftSide(d) ? p.x - hintMargin : p.x + hintMargin;
                return "translate(" + x + ", " + p.y + ")";
              })
              .attr("class", "nv-hint-label")
              .attr("dy", "0.35em")
              // .style("fill", color(d, i))
              .style("fill", "black")
              .style("text-anchor", function() { return isLeftSide(d) ? "end" : "start"; })
              .text(getLabel(d.data));

            // hint value
            hintGroup.append("text")
              .attr("class", "nv-hint-value")
              .attr("dy", -hintValueHeight)
              .style("font-size", hintValueHeight + "px")
              .style("fill", "black")
              .style("text-anchor", "middle") //center the text on it's origin
              .text(d.data.value + " / " + sumY);

            // hint percent
            hintGroup.append("text")
              .attr("class", "nv-hint-value")
              .attr("dy", hintValueHeight)
              .style("font-size", hintValueHeight + "px")
              .style("fill", "black")
              .style("text-anchor", "middle") //center the text on it's origin
              .text((d.data.value * 100 / sumY).toFixed(2) + "%");
          });

        }

        // Computes the angle of an arc, converting from radians to degrees.
        function angle(d) {
          var a = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
          return a > 90 ? a - 180 : a;
        }

        function arcTween(a) {
          if (!donut) a.innerRadius = 0;
          var i = d3.interpolate(this._current, a);
          this._current = i(0);
          return function(t) {
            return arc(i(t));
          };
        }

        function tweenPie(b) {
          b.innerRadius = 0;
          var i = d3.interpolate({startAngle: 0, endAngle: 0}, b);
          return function(t) {
              return arc(i(t));
          };
        }

    });

    return chart;
  }

  chart.width = function(value) {
    if (!arguments.length) return width;
    width = value;
    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.values = function(_) {
    if (!arguments.length) return getValues;
    getValues = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = d3.functor(_);
    return chart;
  };

  chart.showLabels = function(_) {
    if (!arguments.length) return showLabels;
    showLabels = _;
    return chart;
  };

  chart.label = function(_) {
    if (!arguments.length) return getLabel;
    getLabel = _;
    return chart;
  };

  chart.donutLabelsOutside = function(_) {
    if (!arguments.length) return donutLabelsOutside;
    donutLabelsOutside = _;
    return chart;
  };

  chart.donut = function(_) {
    if (!arguments.length) return donut;
    donut = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    return chart;
  };

  chart.valueFormat = function(_) {
    if (!arguments.length) return valueFormat;
    valueFormat = _;
    return chart;
  };

  chart.labelThreshold = function(_) {
    if (!arguments.length) return labelThreshold;
    labelThreshold = _;
    return chart;
  };

  return chart;
}
