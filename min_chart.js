var margin = {top: 10, right: 10, bottom: 20, left: 10},
    outer_width = 600,
    outer_height = 350,
    volume_height = outer_height/3,
    volume_padding = 20,
    width = outer_width - margin.left - margin.right,
    height = outer_height - margin.top - margin.bottom;

var min_max_font_size = "10";

var red = "rgb(224,31,38)";
    green = "rgb(76, 214, 15)"
var show_bound = false;



var unit_width = 0;
var WINDOW_SIZE = 30;

//var svg = d3.select("body").append("svg").attr("class", "chart").attr("width", outer_width).attr("height", outer_height + volume_height);
var svg = d3.select("body").append("svg").attr("class", "chart").attr("width", outer_width).attr("height", height + margin.top + volume_height + margin.bottom);
var olhc = svg.append("g").attr("class", "olhc").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
var volume = svg.append("g").attr("class", "volume").attr("transform", "translate(" + margin.left + "," + (height + margin.top + 5) + ")");

//description
olhc.append("text").attr("transform", "translate(" + margin.left + "," + margin.top + ")").attr("class", "description").text("");
d3.select("text.description").append("tspan").attr("class", "timestamp");
d3.select("text.description").append("tspan").attr("class", "open");
d3.select("text.description").append("tspan").attr("class", "high");
d3.select("text.description").append("tspan").attr("class", "low");
d3.select("text.description").append("tspan").attr("class", "close");
d3.select("text.description").append("tspan").attr("class", "volume");



if(show_bound)
{
  olhc.append("rect")
  .attr("class", "outer")
  .attr("width", width)
  .attr("height", height);
}
if(show_bound)
{
  var volume_rect = volume.append("rect")
  .attr("class", "outer")
  .attr("width", width)
  .attr("height", volume_height);    
}

function set_size(set_width, set_height)
{
  outer_width = set_width;
  outer_height = set_height;
  volume_height = outer_height/3;
  width = outer_width - margin.left - margin.right;
  height = outer_height - margin.top - margin.bottom;
  d3.select("svg.chart").attr("width", width).attr("height", height + margin.top + volume_height + margin.bottom);
  d3.select("g.volume").attr("transform", "translate(" + margin.left + "," + (height + margin.top + 5) + ")");
  init();
}

function init()
{
  var dataset = limit_dataset(WINDOW_SIZE, 0);
  update_olhc(dataset);
  update_volume(dataset);    
  mouse();
}


function limit_dataset(data_size, offset_from_back) {
  return _.first(_.last(olhc_list, data_size + offset_from_back), data_size);
}

var move_offset = 0;
var is_loading = false;

function refresh(offset) {
  move_offset += offset;

  if(move_offset < 0)
    move_offset = 0;
  if(move_offset > olhc_list.length - WINDOW_SIZE * (last_zoom_scale))
    move_offset = olhc_list.length - WINDOW_SIZE * (last_zoom_scale);



  var dataset = limit_dataset(WINDOW_SIZE * (last_zoom_scale), move_offset);     
  if(olhc_list.length * 0.6 < (WINDOW_SIZE * (last_zoom_scale) + move_offset) && !is_loading)
  {
    getOldOLHC(0, function() { console.log('loading done'); is_loading = false; } );
    is_loading = true;
    console.log('need more loading');
  }

  update_olhc(dataset);
  update_volume(dataset);
}

var drag_start_x;
var last_zoom_scale = 1;
function mouse()
{
  var drag = d3.behavior.drag()
  .on("dragstart", function() {
    d3.event.sourceEvent.stopPropagation(); // silence other listeners
    var point = d3.mouse(this), p = {x: point[0], y: point[1] };
    drag_start_x = p.x; })
  .on("drag", function(){ 
    var point = d3.mouse(this), p = {x: point[0], y: point[1] };
    var move_amount = Math.abs(drag_start_x - p.x);
    var move_size = Math.ceil(move_amount / unit_width);

    if(move_amount > unit_width)
    {
      var move_unit = Math.abs(drag_start_x - p.x)/unit_width;
      if(drag_start_x > p.x)
        refresh(-move_unit);
      else
        refresh(move_unit);

      drag_start_x = p.x;
    }
  });


  var zoom = d3.behavior.zoom()
  .scaleExtent([1,10])
  .on("zoom", function(){
    var scale = d3.event.scale;
    if(last_zoom_scale != scale)
    {
      last_zoom_scale = scale;
      refresh(0);
    }
  });

  svg.call(drag);
  svg.call(zoom);
  
  d3.select("svg.chart").on("mouseleave", function(){
    var text = svg.select("text.description");
    text.select("tspan.timestamp").text('');
    text.select("tspan.open").text('');
    text.select("tspan.high").text('');
    text.select("tspan.low").text('');
    text.select("tspan.close").text('');
    text.select("tspan.volume").text('');
  });

}

function o(d) { return Number(d['o']); }
function l(d) { return Number(d['l']); }
function h(d) { return Number(d['h']); }
function c(d) { return Number(d['c']); }
function v(d) { return Number(d['v']); }

var axis_width = 0;
function update_olhc(dataset)
{


  var height_max = d3.max(dataset, function(d) { return h(d) - l(d); });
  var min = d3.min(dataset, function(d){  return l(d); });
  var max = d3.max(dataset, function(d){  return h(d); });

  
  axis_width = max.toString().width();
  var x_scale = d3.scale.ordinal().domain(d3.range(dataset.length)).rangeBands([0, width - axis_width], 0.1);
  var y_scale = d3.scale.linear().domain([min-((min+max)/2-min), max+(max-(min+max)/2)]).range([height, 0]);
  
  //스크롤을 위한 단위너비값 저장
  unit_width = x_scale.rangeBand();

  var price_axis = d3.svg.axis().scale(y_scale).orient("left");

  //add axix
  olhc.selectAll("g.axis").remove();
  olhc.append("g").attr("class", "axis").attr("transform", "translate(" + width + ",0)").call(price_axis);

  //line
  olhc.selectAll("g.olhc").remove();
  olhc_group = olhc.selectAll("g.olhc").data(dataset).enter();

  var g = olhc_group.append("g").attr("class", "olhc");

  
  d3.select('svg.chart').append("rect")
  .attr("class", "overlay")
  .attr("width", outer_width)
  .attr("height", height + margin.top + volume_height + margin.bottom)
  .on("mousemove", function(d, i) { 
    
    var j = 0;
    for(j = 0; j < dataset.length; j++)
    {
      if(x_scale(j) >= d3.mouse(this)[0] - x_scale.rangeBand()/2)
        break;
    }
    j = j-1;
    
    if(j >=0 && j<dataset.length)
    {
      var d = dataset[j];
      var date = moment.unix(d.t);
      var text = svg.select("text.description");

      text.select("tspan.timestamp").text('DATE: ' + date.format('YYYY-MM-DD HH:mm:SS'));
      text.select("tspan.open").attr('dx', '2%').text('O: ' + numeral(o(d)).format('0,0.00'));
      text.select("tspan.high").attr('dx', '2%').text('H: ' + numeral(h(d)).format('0,0.00'));
      text.select("tspan.low").attr('dx', '2%').text('L: ' + numeral(l(d)).format('0,0.00'));
      text.select("tspan.close").attr('dx', '2%').text('C: ' + numeral(c(d)).format('0,0.00'));
      text.select("tspan.volume").attr('dx', '2%').text('V: ' + numeral(v(d)).format('0,0.00'));  
      
      
    }
    
  });
  var max_x, max_y;
  var min_x, min_y;

  //add line
  g.append("line")
  .attr("style", function(d) { return (o(d) <= c(d)?"stroke:" + green + ";stroke-width:0.5":"stroke:" + red + ";stroke-width:0.5"); })
  .attr("x1", function(d, i) { return x_scale(i) + x_scale.rangeBand()/2; })
  .attr("x2", function(d, i) { return x_scale(i) + x_scale.rangeBand()/2; })
  .attr("y1", function(d, i) { return y_scale(l(d)); })
  .attr("y2", function(d, i) {
    //min, max 출력
    if(h(d) == max)
      max_x = x_scale(i) + x_scale.rangeBand()/2, max_y = y_scale(l(d)) + (y_scale(h(d)) - y_scale(l(d))) - 15;
    else if(l(d) == min)
      min_x = x_scale(i) + x_scale.rangeBand()/2, min_y = y_scale(l(d)) + 15;

    return (y_scale(l(d))) + (y_scale(h(d)) - y_scale(l(d)));
  });

  //add rect
  g.append("rect")
  .attr("x", function(d, i) { return x_scale(i); })
  .attr("width", x_scale.rangeBand())
  .attr("y", function(d, i) { return y_scale(Math.max(c(d), o(d))); })
  .attr("height", function(d) { 
    var height = Math.abs(y_scale(o(d))-y_scale(c(d)));
    if(height == 0)
      height = 0.1;
    return height; 
  })
  .attr("class", function(d) { return (o(d) <= c(d)?"green":"red"); });

  //add min, max
  olhc.selectAll("text.min_max").remove();
  add_max(olhc, max, max_x, max_y);
  add_min(olhc, min, min_x, min_y);

}

function update_volume(dataset)
{
  //volume
  var max_dataset = d3.max(dataset, function(d){ return Number(v(d)); });
  var max_volume = Math.ceil(max_dataset/50)*50;

  var x_scale = d3.scale.ordinal().domain(d3.range(dataset.length)).rangeBands([0, width - axis_width], 0.1, 0.0);
  var y_scale = d3.scale.linear().domain([0, max_volume * 1.1]).range([volume_height, 0]);

  var ticks = [max_volume/2, max_volume];
  ticks.push(Number(_.last(dataset)['v']));

  var volume_axis = d3.svg.axis().scale(y_scale).orient("left").tickValues(ticks).tickFormat(d3.format(",.0f"));

  //add axis
  volume.selectAll("g.axis").remove();
  volume.append("g").attr("class", "axis").attr("transform", "translate(" + width + ",0)").call(volume_axis);

  //rect
  volume.selectAll("g.volume").remove();
  volume_group = volume.selectAll("g.volume").data(dataset);

  volume_group.enter().append("g").attr("class", "volume").append("rect")
  .attr("x", function(d, i) { return x_scale(i); })
  .attr("width", x_scale.rangeBand())
  .attr("y", function(d, i) {
    //draw last volume
    if(i >= dataset.length-1) {
      var node = d3.select(this.parentNode).append("line")
      .attr("class", "current_volume")
      .attr("x1", function(d) { return x_scale(i); })
      .attr("x2", function(d) { return width; })
      .attr("y1", function(d) { return y_scale(v(d)); })
      .attr("y2", function(d) { return y_scale(v(d)); });
    }
    return y_scale(v(d));
  })
  .attr("height", function(d) { return volume_height - y_scale(v(d)); })
  .attr("style", function(d) { return (o(d) <= c(d)?"fill:" + green + ";":"fill:" + red + ";"); });

}














//min max

function add_max(node, value, x, y) {
  var text = add_text(node, x, y);

  text.append("tspan")
  .attr("x", x).attr("dy", 0)
  .text(value);

  text.append("tspan")
  .attr("x", x).attr("dy", 10)
  .text("↓");
}

function add_min(node, value, x, y) {
  var text = add_text(node, x, y);

  text.append("tspan")
  .attr("x", x).attr("dy", 0)
  .text("↑");

  text.append("tspan")
  .attr("x", x).attr("dy", 10)
  .text(value);


}

function add_text(node, x, y) {
  return node.append("text")       
  .attr("class", "min_max")
  .attr("font-size", min_max_font_size)
  .attr("text-anchor", "middle")
  .attr("x", x)
  .attr("y", y);
}

//util

String.prototype.width = function(font) {
  var f = font || min_max_font_size + 'px arial',
      o = $('<text>' + this + '</text>')
  //.css({'position': 'absolute', 'float': 'left', 'white-space': 'nowrap', 'visibility': 'hidden', 'font': f})
  .css({'text-anchor': 'middle'})
  .appendTo($('body')),
      w = o.width();

  o.remove();

  return w;
}
