(function() {
    // levels of highlighting
    var intensityLevels = 5;
    //make slider widget for binsize - default 250 word script secitons
    var slideWidget = document.createElement('input');
    slideWidget.id = 'sliderWidget';
    slideWidget.setAttribute('type','range');
    slideWidget.setAttribute('min','20');
    slideWidget.setAttribute('max','1000');
    slideWidget.setAttribute('step','5');
    slideWidget.setAttribute('value','250');
    var slider = document.getElementById('input');
    slider.appendChild(slideWidget);
    document.getElementById('output').innerHTML = 'Words per script section: ' + slideWidget.value;
    
    //make switch for one or two dependent variables
    var chartSwitch = document.getElementById("chart-switch");
    var toggle = document.createElement("input");
    toggle.setAttribute('type','checkbox');
    var toggleLabel = document.createElement('label');
    toggleLabel.setAttribute('class','switch');
    var toggleSpan = document.createElement('span');
    toggleSpan.setAttribute('class','slider round');
    toggleLabel.appendChild(toggle);
    toggleLabel.appendChild(toggleSpan);
    chartSwitch.appendChild(toggleLabel);
    
    //create match legend with default 0 matches
    var legend = document.getElementById('script-legend');
    for (var k = 0; k < intensityLevels; k++) {
        var boxContainer = document.createElement("div");
        boxContainer.id = "bc-" + k;
        var box = document.createElement("div");
        var label = document.createElement("span");
        label.id = "lb-" + k;
    
        label.innerHTML = " 0 matches";
        box.id = "box-" + k;
        box.className = "box match intensity-default";
    
        boxContainer.appendChild(box);
        boxContainer.appendChild(label);
    
        legend.appendChild(boxContainer);
    }
    legend.style.visibility = "hidden";
    
    //function to render the script
    var renderScript = function () {
        d3.queue()
          .defer(d3.csv, 'data/data.csv')
          .defer(d3.csv, 'data/characters.csv')
          .await(function(error, data, namesList) {
            var binSize = document.getElementById('sliderWidget').value;
            var wordCount =  data [(data.length-1)]["ORIGINAL_SCRIPT_WORD_INDEX"];
            var sectionCount = Math.floor(wordCount/binSize) + 1;
            var sectionedScript = document.getElementById('script');
    
            //for script formatting
            var punctuation  = [',', '.', '!', '?', '\''];
            var endpunctuation =  ['.', '!', '?', '"', '...', '....', '--'];
            var contractions = ['\'ve', '\'m', '\'ll', '\'re', '\'s', '\'t', 'n\'t', 'na'];
            var capitals = ['i'];
            for (var i = 0; i < namesList.length; i++) {
                namesList[i] = namesList[i].Character;
            }
    
            for (var i = 0; i < sectionCount + 1; i++) {
                var sectionSpan = document.createElement('span');
                sectionSpan.className = 'script-sections';
                sectionSpan.id = 'script-section-' + i;
                sectionedScript.append(sectionSpan);
            }
    
            for (var j = 0; j < wordCount; j++) {
               var selectedWord = data [j]["ORIGINAL_SCRIPT_WORD"];
               var wordSpan = document.createElement('span');
               wordSpan.className = 'words';
               wordSpan.id = 'word-' + j;
               //test for empty words
               if (selectedWord == '') {
                   selectedWord = data [j]["LOWERCASE"];
               }
               var wordIndex = data [j]["ORIGINAL_SCRIPT_WORD_INDEX"];
               var section = Math.floor(wordIndex / binSize);
               var selectedSpan = document.getElementById('script-section-' + section);
               //speaker tags
               if (j != 0 && (data [j]["CHARACTER"] != data [j-1]["CHARACTER"])) {
                   wordSpan.append(document.createElement('br')); //add newline
                   wordSpan.append(document.createTextNode(' ' + data [j]["CHARACTER"] + ': '));
               }
               //formatting
               if (punctuation.includes(selectedWord) || contractions.includes(selectedWord)) {  //no space before punctuation
                   wordSpan.append(document.createTextNode(selectedWord));
               } else if (j != 0 && endpunctuation.includes(data [j-1]["ORIGINAL_SCRIPT_WORD"])) { //capitalize first word of sentence
                   wordSpan.append(document.createTextNode(' ' + selectedWord[0].toUpperCase() + selectedWord.slice(1)));
               } else if (capitals.includes(selectedWord) || j == 0) { //format things like 'i'
                   wordSpan.append(document.createTextNode(' ' + selectedWord.toUpperCase()));
               } else if (namesList.includes(selectedWord[0].toUpperCase() + selectedWord.slice(1))) { //format names
                   wordSpan.append(document.createTextNode(' ' + selectedWord[0].toUpperCase() + selectedWord.slice(1)));
               } else {
                   wordSpan.append(document.createTextNode(' ' + selectedWord)); //all other words
               }
               selectedSpan.append(wordSpan);
            }
        });
    }
    
    // MAKE CHARTS
    
    //normal bar graph is the default view
    var chart = dc.barChart("#main-chart");
    var chart2 = dc.compositeChart("#secondary-chart");
    d3.csv("data/data.csv", function(error, rawTable) {
    
        var meanAccessor = function(d) { return d.value.sum / d.value.count; };
        var geometricMeanAccessor = function(d) { return Math.exp(d.value.logsum / d.value.count); };
        var countAccessor = function(d) { return d.value.count; };
        var sumAccessor = function(d) { return d.value.sum; };
    
        //check if values are numbers
        var likelyNumeric = function(table, key) {
            //map function takes array and produces another array containing callback results
            var samples = table.map(function(d) { return +d[key]; });
            for (var i = 0; i < samples.length; i++) {
                if (isNaN(samples[i])) {
                    return false;
                }
            }
            return true;
        }
    
        var reduceOnKey = function(dim, key) {
            return dim.group().reduce(
                function(p, v) {
                    p.count += 1; 
                    p.sum += +v[key]; 
                    p.logsum += Math.log(+v[key] + 1);
                    return p; 
                }, function(p, v) {
                    p.count -= 1; 
                    p.sum -= +v[key]; 
                    p.logsum -= Math.log(+v[key] + 1);
                    return p; 
                }, function() {
                    var p = {}; 
                    p.count = 0; 
                    p.sum = 0; 
                    p.logsum = 0;
                    return p; 
                }
            );
        };
        var reduceOnKeySubstring = function(dim, key, sub) {
            return dim.group().reduce(
                function(p, v) {
                    p.count += 1;
                    p.sum += v[key].indexOf(sub) != -1 ? 0 : 1;
                    return p;
                }, function(p, v) {
                    p.count -= 1;
                    p.sum -= v[key].indexOf(sub) != -1 ? 0 : 1;
                    return p;
                }, function() {
                    var p = {}; p.count = 0; p.sum = 0; return p;
                }
            );
        };
    
        var independentAxis = function(table, chart, key, bin) {
            bin = bin || 250;
    
            var modifyAxis = function(d) {
                return Math.floor(+d[key]/bin);
            }
            var dim = table.dimension(modifyAxis);
            var hi = modifyAxis(dim.top(1)[0])+1;
            // var hi = modifyAxis(dim.top(1)[0]);
            var lo = modifyAxis(dim.bottom(1)[0]);
            chart.x(d3.scale.linear().domain([lo, hi]));
            chart.xAxisLabel('Script Section');
            //chart.xAxisLabel(key);
            chart.xAxis().tickFormat(d3.format("d"));
            chart.dimension(dim);
            return dim;
        }
    
        var dependentAxis = function(dim, chart, key, sub) {
            var group;
            group = reduceOnKey(dim, key);
    
            var all = group.all().map(sumAccessor);
            chart.y(d3.scale.linear().domain([0, d3.max(all)]));
            chart.yAxisLabel(key).group(group);
            chart.render();
        }
    
        //find max of section selected
        var sortAxis = function(table, key, scriptStart, scriptEnd) {
            var match = function (d) {
              if (+d["ORIGINAL_SCRIPT_WORD_INDEX"] > scriptStart &&
                  +d["ORIGINAL_SCRIPT_WORD_INDEX"] <= scriptEnd) {
                    return +d[key];
                  }
              else {
                return null;
              }
            }
    
            var dim = table.dimension(match);
            dim.dispose();
            var top = dim.top(3);
            // console.log(top);
            return top[0][key];
        };
    
        // find max of script
        // var sortAxis = function(table, key) {
        //     var match = function (d) {
        //       return +d[key];
        //     }
        //     var dim = table.dimension(match);
        //     var top = dim.top(3);
        //     return top[0][key];
        // }
    
        //filter to find word entered in search box
        var filterAxis = function(table, key, sub) {
            var match = function (d) {
              return d[key];
            }
            var dim = table.dimension(match);
            dim.remove();
            dim.filter(null);
            if (sub == "") {
              dim.filter(function(d) { return d; });
            }
            else {
              dim.filter(function(d) {
                return d.toLowerCase() === sub; });
            }
        }
    
        var updateLegend = function(maxMatch) {
            var legend = document.getElementById('script-legend');
    
            for (var k = 1; k <= intensityLevels; k++) {
                var boxContainer = document.getElementById('bc-' + (k-1));
                var label = document.getElementById('lb-' + (k-1));
                var box = document.getElementById('box-' + (k-1));
                var matchStart = Math.floor((k-1)*maxMatch/intensityLevels);
                var matchEnd = Math.floor(k*maxMatch/intensityLevels);
    
                if (k == 1 || matchStart == matchEnd) {
                    label.innerHTML = " " + matchStart + '-' + matchEnd + ' matches';
                }
                else {
                    label.innerHTML = " " + (matchStart+1) + '-' + matchEnd + ' matches';
                }
    
                box.className = "box match intensity-" + (k-1);
                boxContainer.appendChild(box);
                boxContainer.appendChild(label);
    
                legend.appendChild(boxContainer);
           }
            legend.style.visibility = "visible";
        }
    
        var removeHighlights = function () {
          //remove previous highlights
          var sectionHs = document.getElementsByClassName('script-sections highlight');
          for (var b = 0; b < sectionHs.length; b) {
            sectionHs[b].removeAttribute('class', 'script-sections highlight');
          }
    
         var wordHs = document.getElementsByClassName('words selected');
         for (var a = 0; a < wordHs.length; a) {
           wordHs[a].removeAttribute('class', 'words selected');
         }
    
         for (var i = 0; i < intensityLevels; i++) {
           var intensity = document.getElementsByClassName('match intensity-' + i);
           for (var c = 0; c < intensity.length; c) { //or you can also go backwards
             //skip checkboxes
             if (intensity[c].className.match(/^box/)) {
               c++;
             }
             else {
               intensity[c].removeAttribute('class', 'match intensity-' + i);
             }
           }
         }
        }
    
        var addHighlights = function (table, d) {
         //highlight selected section
          var currentSpan = document.getElementById('script-section-' + d.data.key);
          currentSpan.scrollIntoView();
          currentSpan.setAttribute('class','script-sections highlight');
    
          d3.csv('data/data.csv', function(data) {
            //find max number of positive matches
             var binSize = document.getElementById('sliderWidget').value;
             var scriptSection = d.data.key;
             var totalWords = data [(data.length-1)]["ORIGINAL_SCRIPT_WORD_INDEX"];
             var searchEnd;
             var matches = []; //to account for multiple words highlighted in one section
             var searchStart = scriptSection*binSize;
             if (((scriptSection + 1)*binSize)>totalWords) {
               searchEnd = totalWords;
             }
             else {
               searchEnd = (scriptSection + 1)*binSize;
             }
             
             var sel = document.getElementById("dependent-selector-dropdown");
             var selvalue = sel[sel.selectedIndex].value;
             var maxMatch = sortAxis (cfTable, selvalue, searchStart, searchEnd);
             updateLegend(maxMatch);
    
             //highlighting different intensity levels of matches
             for (var j = searchStart; j < searchEnd; j++) {
               for (var m = 1; m <= intensityLevels; m++) {
                 var matchStart = Math.floor((m-1)*maxMatch/intensityLevels);
                 var matchEnd = Math.floor(m*maxMatch/intensityLevels);
                 if (m == 1) {
                   //include zero matches in search
                   if (data [j] [selvalue] <= matchEnd
                       && data [j] [selvalue] >= matchStart) {
                     var wordSpan = document.getElementById('word-' + data [j] ["ORIGINAL_SCRIPT_WORD_INDEX"]);
                     wordSpan.className = 'match intensity-' + (m-1);
                   }
                 }
                 else if (data [j] [selvalue] <= matchEnd
                     && data [j] [selvalue] > matchStart) {
                   var wordSpan = document.getElementById('word-' + data [j] ["ORIGINAL_SCRIPT_WORD_INDEX"]);
                   wordSpan.className = 'match intensity-' + (m-1);
                 }
               }
             };
    
             //get and highlight words that match word in search box
             for (var k = searchStart; k < searchEnd; k++) {
               if (data [k] ["LOWERCASE"] == textBox.value) {
                 var wordIndex = data [k] ["ORIGINAL_SCRIPT_WORD_INDEX"];
                 matches.push(wordIndex);
               }
             }
             for (var k = 0; k< matches.length; k++) {
               var currentWordSpan = document.getElementById('word-' + matches[k]);
               currentWordSpan.setAttribute('class','words selected');
             }
         });
        }
    
        //create actual chart 1
        chart.margins({top: 50, right: 50, bottom: 50, left: 50})
             .brushOn(false)
             .valueAccessor(sumAccessor)
             .gap(0.2)
             .ordinalColors(['rgba(0,0,255,.5)'])
             .renderVerticalGridLines(true)
             .renderHorizontalGridLines(true)
             .on("renderlet.chart", function(chart) {
                 chart.selectAll('rect').on('click', function(d) {
                   removeHighlights();
                   addHighlights (cfTable, d);
                 });
             });
    
        var cfTable = crossfilter(rawTable);
        var indepDim = independentAxis(cfTable, chart, "ORIGINAL_SCRIPT_WORD_INDEX");
        var keys = Object.keys(rawTable[0]);
        var sel = document.createElement("select");
        sel.setAttribute("id", "dependent-selector-dropdown");
        document.getElementById("dependent-selector").appendChild(sel);
        var ignoreKeyList = ["ORIGINAL_SCRIPT_WORD", "SPACY_ORTH_ID", "ORIGINAL_SCRIPT_WORD_INDEX", "LOWERCASE"];
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            if (!(ignoreKeyList.includes(key))) {
              sel.options[sel.options.length] = new Option(key, key);
            };
        }
        sel.options[0].selected = true;
        sel.addEventListener("change", function() {
            dependentAxis(indepDim, chart, this.value);
            makeChart(chart2);
        });
    
        //select variable to filter by
        var textBox = document.createElement("input");
        var filterSel = document.createElement("select");
        var textSearchContainer = document.getElementById("text-search");
        textSearchContainer.appendChild(textBox);
        textSearchContainer.appendChild(document.createTextNode("\u00a0"));  // Insert non-breaking space
        textSearchContainer.appendChild(filterSel);
        var ignoreKeyFilterList = ["ORIGINAL_SCRIPT_WORD", "SPACY_ORTH_ID", "ORIGINAL_SCRIPT_WORD_INDEX"];
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            if (!(ignoreKeyFilterList.includes(key))) {
              filterSel.options[filterSel.options.length] = new Option(key, key);
            };
        }
        filterSel.options[11].selected = true;
    
        filterSel.addEventListener("change", function() {
            setDependentAxis(textBox, cfTable, indepDim, chart, sel);
            makeChart(chart2);
        });
    
        var setDependentAxis = function (textBox, table, indepDim, chart, sel) {
          textBox.addEventListener("keypress", function(e) {
            if (e.keyCode == 13) {
                  var searchTerms = textBox.value.toLowerCase();
                  searchTerms = searchTerms.replace(/^[ \t]+|[ \t]+$/, '');
                  filterAxis(cfTable, filterSel.options[filterSel.selectedIndex].value, searchTerms);
                  dependentAxis(
                      indepDim,
                      chart,
                      sel.options[sel.selectedIndex].value, //value in dropdown
                      searchTerms //value in textbox
                  );
              }
          });
        }
        setDependentAxis(textBox, cfTable, indepDim, chart, sel);
    
        //CHART 2
        function makeChart(chart) {
            chart.margins({top: 50, right: 55, bottom: 50, left: 50})
                .brushOn(false)
                .renderVerticalGridLines(true)
                .renderHorizontalGridLines(true)
                .y(d3.scale.linear().domain([0, scaleYAxis()]))
                .elasticY(true)
                .compose([
                    dc.lineChart(chart)
                        .valueAccessor(sumAccessor)
                        .colors('blue')
                        .interpolate('monotone')
                        .renderDataPoints({radius: 3, fillOpacity: 0.8, strokeOpacity: 0.8})
                        .renderArea(true)
                        .dashStyle([5,5,5,5])
                        .group(reduceOnKey(indepDim, sel.options[sel.selectedIndex].value))
                        .title(function(d){
                            return d.data.key
                        }),
                    dc.lineChart(chart)
                        .valueAccessor(sumAccessor)
                        .colors('#D32A3E')
                        .interpolate('monotone')
                        .useRightYAxis(true)
                        .renderDataPoints({radius: 3, fillOpacity: 0.8, strokeOpacity: 0.8})
                        .group(reduceOnKey(indepDim2, sel2.options[sel2.selectedIndex].value))
                ])
                .yAxisLabel(sel.options[sel.selectedIndex].value + ' (blue area)')
                .rightYAxisLabel(sel2.options[sel2.selectedIndex].value + ' (red line)')
                .on("renderlet", function(chart) {
                    chart.selectAll('circle.dot').on('click.section', function(d) {
                        removeHighlights();
                        addHighlights(cfTable, d);
                    })
                })
                .render()
        }
        var sel2 = document.createElement("select");
        sel2.id = 'dependent-selector-2-dropdown';
        document.getElementById("dependent-selector-2").appendChild(sel2);
        var ignoreKeyList = ["ORIGINAL_SCRIPT_WORD", "SPACY_ORTH_ID", "ORIGINAL_SCRIPT_WORD_INDEX", "LOWERCASE"];
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            if (!(ignoreKeyList.includes(key))) {
              sel2.options[sel2.options.length] = new Option(key, key);
            };
        }
        sel2.options[0].selected = true;
        sel2.addEventListener("change", function() {
            dependentAxis(indepDim2, chart2, this.value);
            makeChart(chart2);
        });
    
        textBox.addEventListener("keypress", function(e) {
          if (e.keyCode == 13) {
                var searchTerms = textBox.value.toLowerCase();
                searchTerms = searchTerms.replace(/^[ \t]+|[ \t]+$/, '');
                filterAxis(cfTable, filterSel.options[filterSel.selectedIndex].value, searchTerms);
                dependentAxis(
                    indepDim2,
                    chart2,
                    sel2.options[sel2.selectedIndex].value, //value in dropdown
                    searchTerms //value in textbox
                );
    
            }
        });
    
    
    
        function scaleYAxis(right) {
            var op1 = d3.max(reduceOnKey(indepDim, sel.options[sel.selectedIndex].value).all().map(sumAccessor));
            var op2 = d3.max(reduceOnKey(indepDim, sel2.options[sel2.selectedIndex].value).all().map(sumAccessor));
            return right ? op2 : op1;
        }
    
        var indepDim2 = independentAxis(cfTable, chart2, "ORIGINAL_SCRIPT_WORD_INDEX");
        makeChart(chart2);
        // end chart 2
    
        // FOR BOTH CHARTS
        //weird edge case: if filter by search term, adjust slider, then search something different,
        //filter does not reset -- probably have to reset dim
        slideWidget.oninput = function () {
            //remove script section highlighting from previous bin size
            removeHighlights();
    
            //print current slider value
            var out = document.getElementById('output');
            out.innerHTML = 'Words per script section: ' + this.value;
    
            //remake plots with new bin size
            indepDim = independentAxis(cfTable, chart, "ORIGINAL_SCRIPT_WORD_INDEX", slideWidget.value);
    
            var searchTerms = textBox.value.toLowerCase();
            searchTerms = searchTerms.replace(/^[ \t]+|[ \t]+$/, '');
            filterAxis(cfTable, filterSel.options[filterSel.selectedIndex].value, searchTerms);
            dependentAxis(indepDim, chart, sel.options[sel.selectedIndex].value, searchTerms);
    
            indepDim.dispose();
    
            textBox.addEventListener("keypress", function(e) {
              if (e.keyCode == 13) {
                indepDim = independentAxis(cfTable, chart, "ORIGINAL_SCRIPT_WORD_INDEX", slideWidget.value);
                var searchTerms = textBox.value.toLowerCase();
                searchTerms = searchTerms.replace(/^[ \t]+|[ \t]+$/, '');
                filterAxis(cfTable, filterSel.options[filterSel.selectedIndex].value, searchTerms);
                dependentAxis(indepDim, chart, sel.options[sel.selectedIndex].value, searchTerms);
                // setDependentAxis(textBox, cfTable, indepDim, chart, sel);
                indepDim.dispose();
              }
            })
    
            indepDim2 = independentAxis(cfTable, chart2, "ORIGINAL_SCRIPT_WORD_INDEX", slideWidget.value);
            // setDependentAxis(textBox, cfTable, indepDim2, chart2, sel2);
            var searchTerms = textBox.value.toLowerCase();
            searchTerms = searchTerms.replace(/^[ \t]+|[ \t]+$/, '');
            filterAxis(cfTable, filterSel.options[filterSel.selectedIndex].value, searchTerms);
            dependentAxis(indepDim2, chart2, sel2.options[sel2.selectedIndex].value, searchTerms);
    
            textBox.addEventListener("keypress", function(e) {
              if (e.keyCode == 13) {
                var searchTerms = textBox.value.toLowerCase();
                searchTerms = searchTerms.replace(/^[ \t]+|[ \t]+$/, '');
                filterAxis(cfTable, filterSel.options[filterSel.selectedIndex].value, searchTerms);
                dependentAxis(indepDim2, chart2, sel2.options[sel2.selectedIndex].value, searchTerms);
                // setDependentAxis(textBox, cfTable, indepDim2, chart2, sel2);
              }
            })
    
            makeChart(chart2);
    
            var selection = this.value;
            var callback = function (val) {
                if (val == document.getElementById('sliderWidget').value) {
                    document.getElementById('script').innerHTML = ''; //remove previous version of scriont
                    renderScript(); //rewrite script with new bin size/script section sizes
                }
            }
            setTimeout(callback, 1000, selection);
        }
    
        //render charts; 1 is positive match as y-axis
        dependentAxis(indepDim, chart, keys[1]);
        //dependentAxis(indepDim2, chart2, keys[1]);
        renderScript();
    
        //event listener for switch to show/hide single/double bar graph
        document.getElementById("chart-switch").addEventListener('change',function () {
            var main = document.getElementById('main-chart');
            var alt = document.getElementById('secondary-chart');
    
            var selector = document.getElementById('dependent-selector-dropdown');
            var selector2 = document.getElementById('dependent-selector-2-dropdown');
            if (main.className.includes('hide')) { //from 2nd to main
                alt.classList.add('hide');
                main.classList.remove('hide');
                document.getElementById('dependent-selector-2').setAttribute('disabled','disabled');
                selector2.classList.add('grey');
                dependentAxis(indepDim, chart, selector[selector.selectedIndex].value);
                makeChart(chart2);
            } else {                               //from main to 2nd
                main.classList.add('hide');
                alt.classList.remove('hide');
                document.getElementById('dependent-selector-2').removeAttribute('disabled');
                selector2.classList.remove('grey');
                dependentAxis(indepDim, chart, selector2[selector2.selectedIndex].value);
                makeChart(chart2);
            }
        });
    
        document.getElementById('secondary-chart').classList.add('hide'); //default hide double bar graph
        document.getElementById('dependent-selector-2').setAttribute('disabled','disabled');
        document.getElementById('dependent-selector-2-dropdown').classList.add('grey');
    });
})();
