function renderData() {
    clearElements();
    d3.select("#data_display").style("display", "none")
    addLoading();
    var user_input = document.getElementById("usrin");
    user_input = user_input.value + "";
    input_test = user_input.split("/");
    console.log(user_input);
    if (user_input == "") {
        var entry = {"status":"err"};
    }

    if (input_test.length == 1) {
        var entry = { "name": input_test[0], "status": "name_only" };
    } else if (input_test.length == 2) {
        var entry = { "name": input_test[0], "repo": input_test[1], "status": "name_and_repo" };
    } else {
        var entry = {"status":"err"};
    }

    fetch("/func/", {
        method: 'POST',
        headers: new Headers({
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify(entry)
    }).then(function (response) {
        console.log(response.status)
        if (response.status == 404) {
            error_handler();
            removeLoading();
        }
        else {
            removeLoading();
            if (entry["status"] == "name_and_repo") {
                d3.select("#data_display").style("display", "block")
                renderDAG();
                renderBarChart();
                pie_chart();
                render_readme();
            } else {
                d3.select("#data_display").style("display", "none")
                d3.select("body")
                    .append("section")
                    .attr("id", "user_data")
                    .attr("position", "absolute")
                    .style("margin", "auto")
                    .style("width", "1000px")
                    .style("height", "800px")
                    .attr("overflow", "auto")
                    .style("padding-top", "40px");
                renderUserData();
                renderUserDataPieChart();
                render_commits_line_graph();
            }
        }
    });
}

function clearElements() {
    d3.select("#example").remove()
    d3.select("#example_holder").append("h")
        .attr("id","example")
        .attr("class","example")
        .attr("style","{padding-left: 5px; float:left;}")
        .style("color", "black")
        .text("e.g. \"torvalds\" or \"esjmb/github-get\"")
    
    
    
    d3.select("#git_commits_dag").selectAll("*").remove();
    d3.select("#git_commits_bar_chart").selectAll("*").remove();
    d3.select("#pie_chart").selectAll("*").remove();
    d3.select("#data_display").selectAll("#readme").remove();

    d3.select("body").selectAll("#user_data").remove();
}

function error_handler(){
    //d3.select("#example").text("User or repository not found.").style("color", "red")
    d3.select("#example").remove()
    d3.select("#example_holder").append("h")
        .attr("id","example")
        .attr("class","example")
        .attr("style","{padding-left: 5px; float:left;}")
        .style("color", "red")
        .text("User or repository not found.")

    d3.select("body").select("button")
        .attr("disabled", null)
}

function removeLoading() {
    d3.select("body").select("#loading_gif").remove();
    d3.select("body").select("button")
        .attr("disabled", null)
}
function addLoading() {
    d3.select("body").select("button")
        .attr("disabled", "disabled")
    var gif = "/data/loading.gif?u=" + Date.now();

    d3.select("body").append("div")
        .style("margin-left", "35%")
        .style("margin-top", "100px")
        .attr("id", "loading_gif")
        .attr("class", "loading_gif")
        .append("img")
        .attr("width", "400px")
        .attr("height", "400px")
        .attr("src", gif)

}





function renderDAG() {

    var margin = { top: 10, right: 30, bottom: 30, left: 40 },
        width = 900,
        height = 400;


    var time = Date.now();
    var json_file = "/data/network_graph.json?u=" + time;
    d3.json(json_file, function (data) {
        console.log(data)

        var commit_count = "Commits: " + data.nodes.length

        var svg = d3.select("#git_commits_dag")
            .append("svg")
            .attr("class", "network_graph")
            .attr("height", height)
            .append("g");

        d3.select("#git_commits_dag").select("svg").append("text")
            .attr("transform", "translate(" + 5 + "," + (height - 5) + ")")
            .attr("z-index", 10)
            .text("Showing last " + data.nodes.length + " commits");

        var commit_count_header = svg.append("text")
            .attr("class", "commit_count_dag")
            .text(commit_count)

        var zoomRect = svg.append('rect')
            .attr("class", "zoom_rect")
            .attr("height", height)
            .attr("fill", "#fffff7");

        var nodes_data = data.nodes;
        var links_data = data.links;

        var simulation = d3.forceSimulation()
            .nodes(nodes_data);

        var link_force = d3.forceLink(links_data)
            .id(function (d) { return d.id; });

        var charge_force = d3.forceManyBody();

        var center_force = d3.forceCenter(width / 2, height / 2);

        simulation
            .force("charge_force", charge_force)
            .force("center_force", center_force)
            .force("links", link_force)
            ;


        //add tick instructions: 
        simulation.on("tick", tickActions);

        //add encompassing group for the zoom 
        var g = svg.append("g")
            .attr("class", "everything");

        //draw lines for the links 
        var link = g.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(links_data)
            .enter().append("line")
            .attr("stroke-width", 2)
            .style("stroke", "#aaa");

        var node = g.append("g")
            .attr("class", "nodes")
            .selectAll("g")
            .data(nodes_data)
            .enter()
            .append("g");

        var circle = node.append("circle")
            .attr("stroke", "#fff")
            .attr("stroke-width", 3)
            .attr("r", 8)
            .style("fill", "#b41f2b")
            .style("transition", "fill-opacity .2s ease")
            .on("mouseover", function (d) {
                d3.select(this)
                    .attr("fill-opacity", ".8");
            })
            .on("mouseout", function (d) {
                d3.select(this)
                    .attr("fill-opacity", "1");
            });


        var labels = node.append("text")
            .text(function (d) {
                return d.date;
            })
            .attr('x', 18)
            .attr('y', 3)
            .attr("class", "node_label");

        node.append("title")
            .text(function (d) { return d.metadata; });



        var drag_handler = d3.drag()
            .on("start", drag_start)
            .on("drag", drag_drag)
            .on("end", drag_end);

        drag_handler(node);
        //Zoom functions 
        function zoom_actions() {
            g.attr("transform", d3.event.transform)
        }

        //add zoom capabilities 
        var zoom_handler = d3.zoom()
            .scaleExtent([0.1, 2])
            .on("zoom", zoom_actions);

        zoom_handler(zoomRect);

        /** Functions **/


        //Drag functions 
        //d is the node 
        function drag_start(d) {
            if (!d3.event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        //make sure you can't drag the circle outside the box
        function drag_drag(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        }

        function drag_end(d) {
            if (!d3.event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }



        function tickActions() {
            //update circle positions each tick of the simulation 
            node
                .attr("x", function (d) { return d.x; })
                .attr("y", function (d) { return d.y; });

            circle
                .attr("cx", function (d) { return d.x; })
                .attr("cy", function (d) { return d.y; });

            labels
                .attr("x", function (d) { return d.x + 10; })
                .attr("y", function (d) { return d.y - 5; });

            //update link positions 
            link
                .attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("x2", function (d) { return d.target.x; })
                .attr("y2", function (d) { return d.target.y; });
        }
    });


}







var regulatory_height = 0;

function renderBarChart() {

    var time = Date.now();
    var json_file = "/data/bar_chart_data.json?u=" + time;
    d3.json(json_file, function (data) {
        // set the dimensions and margins of the graph
        var margin = { top: 20, right: 30, bottom: 40, left: 160 },
            width = 500 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        var height = 33 * data.length
        regulatory_height = height;
        // append the svg object to the body of the page
        var svg = d3.select("#git_commits_bar_chart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.bottom - 11)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + ",0)");

        // Parse the Data

        // Add X axis
        var x = d3.scaleLinear()
            .domain([0, d3.max(data, function (d) { return d.commits; })])
            .range([0, width]);
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "translate(0,0)")
            .style("text-anchor", "end");

        // Y axis
        var y = d3.scaleBand()
            .range([0, height])
            .domain(data.map(function (d) { return d.author; }))
            .padding(.1);
        svg.append("g")
            .attr("class", "y_axis")
            .call(d3.axisLeft(y))

        var defs = svg.append("defs");
        // black drop shadow
        var filter = defs.append("filter")
            .attr("id", "drop-shadow")
        filter.append("feGaussianBlur")
            .attr("in", "SourceAlpha")
            .attr("stdDeviation", 1)
            .attr("result", "blur");
        filter.append("feOffset")
            .attr("in", "blur")
            .attr("dx", 1)
            .attr("dy", 1)
            .attr("result", "offsetBlur");
        var feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode")
            .attr("in", "offsetBlur")
        feMerge.append("feMergeNode")
            .attr("in", "SourceGraphic");


        //Bars
        svg.selectAll("myRect")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", x(0))
            .attr("y", function (d) { return y(d.author); })
            .attr("width", function (d) { return x(d.commits); })
            .attr("height", y.bandwidth())
            .attr("fill", "#1f38b4")
            .attr("rx", "3px")
            .style("transition", "fill-opacity .4s ease")
            .on("mouseover", function (d) {
                d3.select(this)
                    //.attr("fill-opacity", ".8")
                    .style("filter", "url(#drop-shadow)");
            })
            .on("mouseout", function (d) {
                d3.select(this)
                    //.attr("fill-opacity", "1")
                    .style("filter", "none");
            })
            .append("title")
            .text(function (d) { return d.commits; });


    });
}






function pie_chart() {

    var time = Date.now();
    var json_file = "/data/langs.json?u=" + time;
    d3.json(json_file, function (data) {

        var legendSpacing = 7; // defines spacing between squares
        var legend_radius = 4;

        // legend dimensions
        var width = 400
        height = 180
        margin = 20

        // The radius of the pieplot is half the width or half the height (smallest one). I subtract a bit of margin.
        // var radius = 80
        if (regulatory_height > 180) regulatory_height = 90;
        else if (regulatory_height < 66) regulatory_height = 66;
        var radius = regulatory_height;

        /* d3.select("#pie_chart")
            .append("h2")
            .text("Language Breakdown") */

        var svg = d3.select("#pie_chart")
            .append("svg")
            .style("border-left", "1px solid black")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + width / 3 + "," + radius + ")");


        // set the color scale
        var color = d3.scaleOrdinal()
            .domain(Object.keys(data))
            .range(d3.schemeDark2);

        // Compute the position of each group on the pie:
        var pie = d3.pie()
            .padAngle(0.01)
            .sort(null) // Do not sort group by size
            .value(function (d) { return d.value; })
        var data_ready = pie(d3.entries(data))

        // The arc generator
        var arc = d3.arc()
            .cornerRadius(2)
            .innerRadius(radius * 0)         // This is the size of the donut hole
            .outerRadius(radius * 0.8)

        // Another arc that won't be drawn. Just for labels positioning
        var outerArc = d3.arc()
            .innerRadius(radius * 0.9)
            .outerRadius(radius * 0.9)



        var defs = svg.append("defs");
        // black drop shadow
        var filter = defs.append("filter")
            .attr("id", "drop-shadow")
        filter.append("feGaussianBlur")
            .attr("in", "SourceAlpha")
            .attr("stdDeviation", 1)
            .attr("result", "blur");
        filter.append("feOffset")
            .attr("in", "blur")
            .attr("dx", 1)
            .attr("dy", 1)
            .attr("result", "offsetBlur");
        var feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode")
            .attr("in", "offsetBlur")
        feMerge.append("feMergeNode")
            .attr("in", "SourceGraphic");


        // Build the pie chart: Basically, each part of the pie is a path that we build using the arc function.
        svg
            .selectAll('allSlices')
            .data(data_ready)
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', function (d) { return (color(d.data.key)) })
            //.attr("stroke", "#fffff5")
            //.style("stroke-width", "1px")
            .style("opacity", 0.8)
            .style("transition", "fill-opacity .4s ease")
            .on("mouseover", function (d) {
                d3.select(this)
                    .attr("fill-opacity", ".8")
                    .style("filter", "url(#drop-shadow)");
                //tooltip.select('.label').html(d.data.key);
                //tooltip.style('display', 'block');
            })
            .on("mouseout", function (d) {
                d3.select(this)
                    .attr("fill-opacity", "1")
                    .style("filter", "none");
                //tooltip.style('display', 'none');
            })
            .append("title")
            .text(function (d) { return d.data.key; });


        // define legend
        var legend = svg.selectAll('.legend') // selecting elements with class 'legend'
            .data(color.domain()) // refers to an array of labels from our dataset
            .enter() // creates placeholder
            .append('g') // replace placeholders with g elements
            .attr('class', 'legend') // each g is given a legend class
            .attr('transform', function (d, i) {
                var height = 15 + legendSpacing; // height of element is the height of the colored square plus the spacing      
                var offset = height * color.domain().length / 2; // vertical offset of the entire legend = height of a single element & half the total number of elements  
                var vert = i * height - offset; // the top of the element is hifted up or down from the center using the offset defiend earlier and the index of the current element 'i'               
                return 'translate(' + radius + ',' + vert + ')'; //return translation       
            });

        // adding colored squares to legend
        legend.append('circle') // append rectangle squares to legend                                   
            .attr("r", legend_radius)
            .style('fill', color) // each fill is passed a color
            .style('stroke', color) // each stroke is passed a color


        // adding text to legend
        legend.append('text')
            .attr('x', legend_radius + legendSpacing)
            .attr('y', 1 + (legend_radius / 2))
            .attr("font-size", "12px")
            .data(data_ready)
            .text(function (d) { return d.data.key + " - " + d.data.value + "%"; }); // return label

    });
}






/*  -- RENDER README -- */

function render_readme() {
    var div = d3.select("#data_display")
        .append("div")
        .attr("padding-top", "20px")
        .attr("id", "readme")
        .style("background", "#ffffff")
        .style("border-left", "1px solid black")
        .style("margin-left", "10%")
        .style("margin-right", "10%")
        .style("padding-left", "20px");

    d3.select("#data_display").select("#readme").append("h2").attr("class", "readme_title").text("README.md");

    var time = Date.now();
    var readme_html = "/data/readme.html?u=" + time;
    var rawFile = new XMLHttpRequest();

    rawFile.open("GET", readme_html, false);
    rawFile.onreadystatechange = function () {
        if (rawFile.readyState === 4) {
            if (rawFile.status === 200 || rawFile.status == 0) {
                var allText = rawFile.responseText;
                document.getElementById("readme").innerHTML += allText;

            }
        }
    }
    rawFile.send(null);

}








function renderUserData() {
    //    avi.src = "/data/avatar.jpg";

    var user_avi_svg = d3.select("#user_data")
        .append("svg")
        .style("float", "left")
        .attr("id", "user_svg")
        .attr("class", "user_svg")
        .attr("height", "810")
        .attr("width", "320")
        .style("padding-left", "5px");

    var defs = user_avi_svg.append("defs");
    // black drop shadow
    var filter = defs.append("filter")
        .attr("id", "drop-shadow")
    filter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 1)
        .attr("result", "blur");
    filter.append("feOffset")
        .attr("in", "blur")
        .attr("dx", 0)
        .attr("dy", 0)
        .attr("result", "offsetBlur");
    var feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode")
        .attr("in", "offsetBlur")
    feMerge.append("feMergeNode")
        .attr("in", "SourceGraphic");

    user_avi_svg.append("rect")
        .attr("height", "800")
        .attr("width", "305")
        .attr("fill", "white")
        .style("filter", "url(#drop-shadow)")
        .attr("transform", "translate(5,5)");
    var avi_html = "/data/avatar.jpg?u=" + Date.now();

    // black drop shadow

    user_avi_svg.append("svg:image")
        .attr("id", "user_avi")
        .attr("href", avi_html)
        .attr("width", "256")
        .attr("height", "256")
        .attr("x", "5")
        .attr("y", "5")
        .style("rx", "3px")
        .attr("transform", "translate(25,25)");;

    var json_file = "/data/user_data.json?u=" + Date.now();
    d3.json(json_file, function (data) {

        d3.select('#user_svg')
            .append("g")
            .attr("id", "card_username_holder")
            .attr("class", "card_username_holder")
            .attr("transform", "translate(150," + 315 + ")")
            .append("text")
            .attr("text-anchor", "middle")
            .attr("id", "card_username")
            .attr("class", "card_username")
            .style("font-family", "Garamond")
            .style("font-size", "25px")
            .style("text-shadow", "1px 1px grey")
            .text("username ")

        d3.select('#user_svg')
            .append("a")
            .attr("xlink:href", data.url)
            .attr("target", "_blank")
            .attr("transform", "translate(150,335)")
            .append("text")
            .attr("text-anchor", "middle")
            .attr("id", "card_username_id")
            .attr("class", "card_username_id")
            .style("font-family", "Garamond")
            .style("font-size", "22px")
            .style("fill", "grey")
            .text(data.username)

        d3.select('#user_svg')
            .append("g")
            .attr("id", "followers_card")
            .attr("class", "followers")
            .attr("transform", "translate(55," + 355 + ")")
            .append("rect")
            //.style("filter", "url(#drop-shadow)")
            .attr("height", "50")
            .attr("width", "85")
            .attr("rx", "5")
            .attr("fill", "white")
            .attr("stroke", "grey")
            .attr("stroke-width", "2")

        d3.select("#followers_card").append("text")
            .attr("transform", "translate(10,20)")
            .text("Followers")

        d3.select("#followers_card").append("text")
            .attr("transform", "translate(42,40)")
            .attr("text-anchor", "middle")
            .text(data.followers)

        d3.select('#user_svg')
            .append("g")
            .attr("id", "following_card")
            .attr("class", "following")
            .attr("transform", "translate(165," + 355 + ")")
            .append("rect")
            //.style("filter", "url(#drop-shadow)")
            .attr("height", "50")
            .attr("width", "85")
            .attr("rx", "5")
            .attr("fill", "white")
            .attr("stroke", "grey")
            .attr("stroke-width", "2")

        d3.select("#following_card").append("text")
            .attr("transform", "translate(10,20)")
            .text("Following")

        d3.select("#following_card").append("text")
            .attr("transform", "translate(42,40)")
            .attr("text-anchor", "middle")
            .text(data.following)

        d3.select('#user_svg')
            .append("g")
            .attr("transform", "translate(150," + 440 + ")")
            .append("text")
            .attr("text-anchor", "middle")
            .style("font-family", "Garamond")
            .style("font-size", "25px")
            //.style("text-shadow", "1px 1px grey")
            .style("font-weight", "bold")
            .text("Starred Repos")

        d3.select("#user_svg")
            .append("g")
            .attr("transform", "translate(30," + 460 + ")")
            .attr("class", "starred_repos")
            .attr("id", "starred_repos")

        var starred = data.starred
        var y_offset = 30
        max = (starred.length <= 10 ? starred.length : 10)
        for (var i = 0; i < max; i++) {
            var sec = d3.select('#starred_repos')
                .append("g")
                .attr("transform", "translate(0," + y_offset + ")")

            var repo_name = sec.append("a")
                .attr("href", starred[i].url)
                .append("text")
                .style("font-weight", "bold")
                .text(starred[i].name + " - ")
            var text_width = repo_name.node().getBBox().width

            //245px max
            sec.append("text")
                .attr("id", "text_lol")
                .text(starred[i].desc)
                .attr("transform", "translate(" + (3 + text_width) + ",0)")
                .append("title")
                .text(starred[i].desc)

            var total_width = sec.node().getBBox().width

            if (total_width > 250) {
                console.log(total_width)
                var text_to_append = starred[i].desc
                text_to_append = text_to_append.substring(0, text_to_append.length - 2)
                while (total_width > 250) {
                    sec.select("#text_lol").remove()
                    text_to_append = text_to_append.substring(0, text_to_append.length - 1)
                    sec.append("text")
                        .attr("id", "text_lol")
                        .text(text_to_append)
                        .attr("transform", "translate(" + (3 + text_width) + ",0)")
                        .append("title")
                        .text(starred[i].desc)

                    total_width = sec.node().getBBox().width
                }
                if (total_width = 250) {
                    sec.select("#text_lol").remove()
                    text_to_append = text_to_append.substring(0, text_to_append.length - 3)
                    text_to_append += "..."
                    sec.append("text")
                        .attr("id", "text_lol")
                        .text(text_to_append)
                        .attr("transform", "translate(" + (3 + text_width) + ",0)")
                        .append("title")
                        .text(starred[i].desc)

                }
            }
            y_offset += 30
        }
    });
}






/* --  Render github activity line graph  -- */

function render_commits_line_graph() {

    var parseDate = d3.timeFormat("%Y-%m-%d").parse,
        bisectDate = d3.bisector(function (d) { return d.date; }).left,
        yFormat = d3.format(",.0f"),
        formatValue = d3.format(","),
        dateFormatter = d3.timeFormat("%Y-%m-%d");


    var json_file = "/data/user_events.json?u=" + Date.now();
    d3.json(json_file, function (data) {
        var margin = { top: 30, right: 132, bottom: 30, left: 50 },
            width = 800 - margin.left - margin.right,
            height = 320

        if (data.length == 0) {
            var svg = d3.select("#user_data").append("div")
                .style("position", "absolute")
                .style("width", width)
                .style("height", height)
                .append("h3")
                .attr("id", "no-data")
                .text("No data for last 90 days.");
            return;
        }


        d3.select("#user_data").append("section").attr("id", "line_graph_section").attr("class", "line_graph_section")
            .style("position", "relative")
            .attr("transform", "translate(305,0)")
            //.style("left", "320px")
            //.attr("float","right")
            .style("width", "800px")
            .style("height", "380px")
            .append("svg")
            .style("position", "absolute")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("class", "line_chart")
            .attr("transform", "translate(5,0)")
            .attr("id", "line_chart");
        var tooltip = d3.select("#line_graph_section").append("div")
            .attr("class", "tooltip")
            .style("display", "none");

        var svg = d3.select("#line_chart").append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");





        data.forEach(function (d) {
            d.date = d3.timeParse("%Y-%m-%d")(d.date);
            d.commits = +d.commits;
        });

        data.sort(function (a, b) {
            return a.date - b.date;
        });

        console.log(data);

        var x = d3.scaleTime()
            .range([0, width]);

        var y = d3.scaleLinear()
            .range([height, 0]);


        var x = d3.scaleTime().domain(d3.extent(data, function (d) { return d.date; })).range([0, width]);
        var y = d3.scaleLinear().domain([0, d3.max(data, function (d) { return d.commits; })]).range([height, 0]);

        var line = d3.line()
            .x(function (d) { return x(d.date); })
            .y(function (d) { return y(d.commits); });

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

        svg.append("g")
            .attr("class", "y axis")
            .attr("id", "y_axis")
            .call(d3.axisLeft(y).tickFormat(yFormat))

        svg.select("#y_axis").append("g").append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 10)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Number of Commits");

        svg.append("path")
            .datum(data)
            .attr("class", "commits_line")
            .attr("d", line);

        var focus = svg.append("g")
            .attr("class", "focus")
            .style("display", "none");

        focus.append("circle")
            .attr("r", 5);

        var tooltipDate = tooltip.append("div")
            .attr("class", "tooltip-date");

        var tooltipCommits = tooltip.append("div");
        tooltipCommits.append("span")
            .attr("class", "tooltip-title")
            .text("Commits: ");

        var tooltipCommitsValue = tooltipCommits.append("span")
            .attr("class", "tooltip-commits");

        svg.append("rect")
            .attr("class", "overlay")
            .attr("width", width)
            .attr("height", height)
            .on("mouseover", function () { focus.style("display", null); tooltip.style("display", null); })
            .on("mouseout", function () { focus.style("display", "none"); tooltip.style("display", "none"); })
            .on("mousemove", mousemove);

        function mousemove() {
            var x0 = x.invert(d3.mouse(this)[0]),
                i = bisectDate(data, x0, 1),
                d0 = data[i - 1],
                d1 = data[i],
                d = x0 - d0.date > d1.date - x0 ? d1 : d0;
            focus.attr("transform", "translate(" + x(d.date) + "," + y(d.commits) + ")");
            tooltip.attr("style", "left:" + (x(d.date) + 394) + "px;top:" + y(d.commits) + "px;");
            tooltip.select(".tooltip-date").text(dateFormatter(d.date));
            tooltip.select(".tooltip-commits").text(formatValue(d.commits));
        }
    });
}








function renderUserDataPieChart() {
    var time = Date.now();
    var json_file = "/data/fav_langs.json?u=" + time;
    d3.json(json_file, function (data) {

        var legendSpacing = 7; // defines spacing between squares
        var legend_radius = 4;

        // legend dimensions
        var width = 500
        height = 560
        margin = 20

        // The radius of the pieplot is half the width or half the height (smallest one). I subtract a bit of margin.
        // var radius = 80
        var radius = 170;


        var svg = d3.select("#user_data")
            .append("section")
            .attr("position", "relative")
            .attr("id", "user_data_pie_chart")
            .attr("class", "user_data_pie_chart")
            .attr("width", "800px")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + 230 + "," + 250 + ")");

        d3.select("#user_data_pie_chart").select("svg")
            .append("g")
            .attr("transform", "translate(" + 20 + "," + 80 + ")")
            .append("text").text("Repo Language Breakdown")
            ///.style("font-size", "15px")
            .style("font-weight", "bold")

        // set the color scale
        var color = d3.scaleOrdinal()
            .domain(Object.keys(data))
            .range(d3.schemeDark2);

        // Compute the position of each group on the pie:
        var pie = d3.pie()
            .padAngle(0.01)
            .sort(null) // Do not sort group by size
            .value(function (d) { return d.value; })
        var data_ready = pie(d3.entries(data))

        // The arc generator
        var arc = d3.arc()
            .cornerRadius(2)
            .innerRadius(radius * 0)         // This is the size of the donut hole
            .outerRadius(radius * 0.8)

        // Another arc that won't be drawn. Just for labels positioning
        var outerArc = d3.arc()
            .innerRadius(radius * 0.9)
            .outerRadius(radius * 0.9)



        var defs = svg.append("defs");
        // black drop shadow
        var filter = defs.append("filter")
            .attr("id", "drop-shadow")
        filter.append("feGaussianBlur")
            .attr("in", "SourceAlpha")
            .attr("stdDeviation", 1)
            .attr("result", "blur");
        filter.append("feOffset")
            .attr("in", "blur")
            .attr("dx", 1)
            .attr("dy", 1)
            .attr("result", "offsetBlur");
        var feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode")
            .attr("in", "offsetBlur")
        feMerge.append("feMergeNode")
            .attr("in", "SourceGraphic");


        // Build the pie chart: Basically, each part of the pie is a path that we build using the arc function.
        svg
            .selectAll('allSlices')
            .data(data_ready)
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', function (d) { return (color(d.data.key)) })
            //.attr("stroke", "#fffff5")
            //.style("stroke-width", "1px")
            .style("opacity", 0.8)
            .style("transition", "fill-opacity .4s ease")
            .on("mouseover", function (d) {
                d3.select(this)
                    .attr("fill-opacity", ".8")
                    .style("filter", "url(#drop-shadow)");
                //tooltip.select('.label').html(d.data.key);
                //tooltip.style('display', 'block');
            })
            .on("mouseout", function (d) {
                d3.select(this)
                    .attr("fill-opacity", "1")
                    .style("filter", "none");
                //tooltip.style('display', 'none');
            })
            .append("title")
            .text(function (d) { return d.data.key; });


        // define legend
        var legend = svg.selectAll('.legend') // selecting elements with class 'legend'
            .data(color.domain()) // refers to an array of labels from our dataset
            .enter() // creates placeholder
            .append('g') // replace placeholders with g elements
            .attr('class', 'legend') // each g is given a legend class
            .attr('transform', function (d, i) {
                var height = 15 + legendSpacing; // height of element is the height of the colored square plus the spacing      
                var offset = height * color.domain().length / 2; // vertical offset of the entire legend = height of a single element & half the total number of elements  
                var vert = i * height - offset; // the top of the element is hifted up or down from the center using the offset defiend earlier and the index of the current element 'i'               
                return 'translate(' + radius + ',' + vert + ')'; //return translation       
            });

        // adding colored squares to legend
        legend.append('circle') // append rectangle squares to legend                                   
            .attr("r", legend_radius)
            .style('fill', color) // each fill is passed a color
            .style('stroke', color) // each stroke is passed a color


        // adding text to legend
        legend.append('text')
            .attr('x', legend_radius + legendSpacing)
            .attr('y', 1 + (legend_radius / 2))
            .attr("font-size", "15px")
            .data(data_ready)
            .text(function (d) { return d.data.key + " - " + d.data.value + ""; }); // return label

    });
}
