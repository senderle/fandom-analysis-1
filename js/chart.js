(function() {
    // levels of highlighting
    // true global in module, so all-caps
    var INTENSITYLEVELS = 10;

    //make slider widget for binsize - default 250 word script secitons
    var makeSlider = function(inputEl, outputEl) {
        var slideWidget = document.createElement('input');
        slideWidget.id = 'slider-widget';
        slideWidget.setAttribute('type','range');
        slideWidget.setAttribute('min','20');
        slideWidget.setAttribute('max','1000');
        slideWidget.setAttribute('step','5');
        slideWidget.setAttribute('value','250');
        inputEl.appendChild(slideWidget);
        outputEl.innerHTML = 'Words per script section: ' + slideWidget.value;
    }

    makeSlider(
        document.getElementById('slider-input'),
        document.getElementById('slider-output')
    );

    var makeToggle = function(parentElement) {
        var toggle = document.createElement("input");
        toggle.setAttribute('type','checkbox');
        var toggleLabel = document.createElement('label');
        toggleLabel.setAttribute('class','switch');
        var toggleSpan = document.createElement('span');
        toggleSpan.setAttribute('class','slider round');
        toggleLabel.appendChild(toggle);
        toggleLabel.appendChild(toggleSpan);
        parentElement.appendChild(toggleLabel);
    }

    //make switch for one or two dependent variables
    makeToggle(document.getElementById("chart-switch"));
    makeToggle(document.getElementById('smoothing-switch'));
    ///////////

    //create match legend with default 0 matches
    var makeLegend = function(parentElement) {
        for (var k = 0; k < INTENSITYLEVELS; k++) {
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

            parentElement.appendChild(boxContainer);
        }
        parentElement.style.visibility = "hidden";
    }
    
    makeLegend(document.getElementById('script-legend'));

    var makeDependentSelectorDropdown = function(parentElement, selId, keys) {
        var sel = document.createElement('select');
        sel.setAttribute('id', selId);
        parentElement.appendChild(sel);

        var ignoreKeyList = ["ORIGINAL_SCRIPT_WORD", "SPACY_ORTH_ID", "ORIGINAL_SCRIPT_WORD_INDEX", "LOWERCASE"];
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            if (!(ignoreKeyList.includes(key))) {
                sel.options[sel.options.length] = new Option(key, key);
            };
        }

        sel.options[0].selected = true;
        return sel;
    }

    var makeFilter = function(parentElement, textBox, keys) {
        //select variable to filter by
        var filterSel = document.createElement("select");
        parentElement.appendChild(textBox);
        parentElement.appendChild(document.createTextNode("\u00a0"));  // Insert non-breaking space
        parentElement.appendChild(filterSel);
        var ignoreKeyFilterList = ["ORIGINAL_SCRIPT_WORD", "SPACY_ORTH_ID", "ORIGINAL_SCRIPT_WORD_INDEX"];
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            if (!(ignoreKeyFilterList.includes(key))) {
                filterSel.options[filterSel.options.length] = new Option(key, key);
            };
        }
        filterSel.options[11].selected = true;

        return filterSel;
    }

    var wordFormatter = function(names) {
        var punctuation  = [',', '.', '!', '?', '\''];
        var endpunctuation =  ['.', '!', '?', '"', '...', '....', '--'];
        var contractions = ['\'ve', '\'m', '\'ll', '\'re', '\'s', '\'t', 'n\'t', 'na'];
        var capitals = ['i'];

        var formatWord = function(word, character, prevWord, prevChar) {
            var wordSpan = document.createElement('span');
            wordSpan.className = 'words';

            if (character != prevChar) {
                var charSpan = document.createElement('span');
                charSpan.className = 'character-name';
                charSpan.append(document.createTextNode(' ' + character + ': '));

                wordSpan.append(document.createElement('br')); //add newline
                wordSpan.append(charSpan);
            }

            if (punctuation.includes(word) || contractions.includes(word)) {  
                //no space before punctuation
                wordSpan.append(document.createTextNode(word));
            } else if (prevWord == null || endpunctuation.includes(prevWord)) { 
                //capitalize first word of sentence
                wordSpan.append(document.createTextNode(' ' + word[0].toUpperCase() + word.slice(1)));
            } else if (capitals.includes(word)) { 
                //format things like 'i'
                wordSpan.append(document.createTextNode(' ' + word.toUpperCase()));
            } else if (names.includes(word[0].toUpperCase() + word.slice(1))) { 
                //format names
                wordSpan.append(document.createTextNode(' ' + word[0].toUpperCase() + word.slice(1)));
            } else {
                //all other words
                wordSpan.append(document.createTextNode(' ' + word)); 
            }
            return wordSpan;
        };
        return formatWord;
    };

    //function to render the script
    var renderScript = function () {
        Promise.all([d3.csv('data/data.csv'), d3.csv('data/characters.csv')])
            .then(function(data_names) {
                var data = data_names[0];
                var namesList = data_names[1];
                var binSize = document.getElementById('slider-widget').value;
                var wordCount = data[(data.length-1)]["ORIGINAL_SCRIPT_WORD_INDEX"];
                var sectionCount = Math.floor(wordCount/binSize) + 1;
                var sectionedScript = document.getElementById('script');

                for (var i = 0; i < namesList.length; i++) {
                    namesList[i] = namesList[i].Character;
                }
                var formatWord = wordFormatter(namesList);

                for (var i = 0; i < sectionCount + 1; i++) {
                    var sectionSpan = document.createElement('span');
                    sectionSpan.className = 'script-sections';
                    sectionSpan.id = 'script-section-' + i;
                    sectionedScript.append(sectionSpan);
                }

                for (var j = 0; j < wordCount; j++) {
                    var character = data[j]["CHARACTER"];
                    var word = data[j]["ORIGINAL_SCRIPT_WORD"];
                    if (word == '') { word = data[j]["LOWERCASE"]; }

                    var wordIndex = data[j]["ORIGINAL_SCRIPT_WORD_INDEX"];
                    var section = Math.floor(wordIndex / binSize);
                    var selectedSpan = document.getElementById('script-section-' + section);

                    var wordSpan;
                    if (j == 0) {
                        wordSpan = formatWord(word, character);
                    } else {
                        var prevChar = data[j - 1]["CHARACTER"];
                        var prevWord = data[j - 1]["ORIGINAL_SCRIPT_WORD"];
                        wordSpan = formatWord(word, character, prevWord, prevChar);
                    }
                    wordSpan.id = 'word-' + j;
                    selectedSpan.append(wordSpan);
                }
            });
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

        for (var i = 0; i < INTENSITYLEVELS; i++) {
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

    var addHighlights = function(rawTable, cfTable, d) {
        //highlight selected section
        var currentSpan = document.getElementById('script-section-' + d.data.key);
        currentSpan.scrollIntoView();
        currentSpan.setAttribute('class','script-sections highlight');

        //find max number of positive matches
        var binSize = document.getElementById('slider-widget').value;
        var scriptSection = d.data.key;
        var totalWords = getTotalWords(rawTable);
        var searchEnd;
        var matches = []; //to account for multiple words highlighted in one section
        var searchStart = scriptSection * binSize;
        if (((scriptSection + 1) * binSize) > totalWords) {
            searchEnd = totalWords;
        }
        else {
            searchEnd = (scriptSection + 1) * binSize;
        }

        var sel = document.getElementById("dependent-selector-dropdown");
        var selvalue = sel[sel.selectedIndex].value;
        var maxMatch = sortAxis(cfTable, selvalue, searchStart, searchEnd);
        updateLegend(maxMatch);

        //highlighting different intensity levels of matches
        for (var j = searchStart; j < searchEnd; j++) {
            for (var m = 1; m <= INTENSITYLEVELS; m++) {
                var matchStart = Math.floor((m-1)*maxMatch/INTENSITYLEVELS);
                var matchEnd = Math.floor(m*maxMatch/INTENSITYLEVELS);
                if (m == 1) {
                    //include zero matches in search
                    if (rawTable [j] [selvalue] <= matchEnd
                        && rawTable [j] [selvalue] >= matchStart) {
                        var wordSpan = document.getElementById('word-' + rawTable [j] ["ORIGINAL_SCRIPT_WORD_INDEX"]);
                        wordSpan.className = 'match intensity-' + (m-1);
                    }
                }
                else if (rawTable [j] [selvalue] <= matchEnd
                    && rawTable [j] [selvalue] > matchStart) {
                    var wordSpan = document.getElementById('word-' + rawTable [j] ["ORIGINAL_SCRIPT_WORD_INDEX"]);
                    wordSpan.className = 'match intensity-' + (m-1);
                }
            }
        };
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

    var accessor = {
        'meanAccessor': function(d) { 
            return d.value.count ? d.value.sum / d.value.count : 0; 
        },
        'geometricMeanAccessor': function(d) { 
            return Math.exp(d.value.count ? d.value.logsum / d.value.count : -1); 
        },
        'countAccessor': function(d) { return d.value.count; }, 
        'sumAccessor': function(d) { return d.value.sum; },
        'select': function(selection) {
            this.selectedKey = selection;
            this.selected = this[selection];
        },
        'toggle': function() {
            if (this.selectedKey === 'meanAccessor') {
                this.select('geometricMeanAccessor');
            } else {
                this.select('meanAccessor');
            }
        }
    }
    accessor.select('meanAccessor');

    var independentAxis = function(cfTable, chart, binsize, nBins) {
        var key = "ORIGINAL_SCRIPT_WORD_INDEX";

        var modifyAxis = function(d) {
            return Math.floor(+d[key] / binsize);
        }

        var lo = 0;
        var hi = nBins;
        
        var dim = cfTable.dimension(modifyAxis);
        chart.x(d3.scaleLinear().domain([0, hi]));
        chart.xAxisLabel('Script Section');
        chart.xAxis().tickFormat(d3.format("d"));
        chart.dimension(dim);
        return dim;
    }

    var independentAxisBar = function(cfTable, chart, totalWords, binsize) {
        binsize = binsize || 250;
        var nBins = Math.floor((totalWords - 1) / binsize) + 1;
        return independentAxis(cfTable, chart, binsize, nBins);
    }

    var independentAxisLine = function(cfTable, chart, totalWords, binsize) {
        binsize = binsize || 250;
        var nBins = Math.floor((totalWords - 1) / binsize);
        return independentAxis(cfTable, chart, binsize, nBins);
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
                return d.toLowerCase() === sub; 
            });
        }
    }

    var updateLegend = function(maxMatch) {
        var legend = document.getElementById('script-legend');

        for (var k = 1; k <= INTENSITYLEVELS; k++) {
            var boxContainer = document.getElementById('bc-' + (k-1));
            var label = document.getElementById('lb-' + (k-1));
            var box = document.getElementById('box-' + (k-1));
            var matchStart = Math.floor((k-1)*maxMatch/INTENSITYLEVELS);
            var matchEnd = Math.floor(k*maxMatch/INTENSITYLEVELS);

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

    var configureMainChart = function(chart, indepDim, sel, rawTable, cfTable) {
        chart.margins({top: 50, right: 50, bottom: 50, left: 50})
            .brushOn(false)
            .renderVerticalGridLines(true)
            .renderHorizontalGridLines(true)
            .gap(0.2)
            .elasticY(true)
            .valueAccessor(accessor.selected)
            .ordinalColors(['rgba(0,0,255,.5)'])
            .group(reduceOnKey(indepDim, sel.options[sel.selectedIndex].value))
            .yAxisLabel(sel.options[sel.selectedIndex].value)
            .on("renderlet.chart", function(chart) {
                chart.selectAll('rect').on('click', function(d) {
                    removeHighlights();
                    addHighlights(rawTable, cfTable, d);
                });
            })
            .render();
    }

    var configureSecondaryChart = function(chart, indepDim, indepDim2, sel, sel2, rawTable, cfTable) {
        chart.margins({top: 50, right: 55, bottom: 50, left: 50})
            .brushOn(false)
            .renderVerticalGridLines(true)
            .renderHorizontalGridLines(true)
            .elasticY(true)
            .compose([
                dc.lineChart(chart)
                .valueAccessor(accessor.selected)
                .colors('blue')
                .curve(d3.curveMonotoneX)
                .renderDataPoints({radius: 3, fillOpacity: 0.8, strokeOpacity: 0.8})
                .renderArea(true)
                .dashStyle([5,5,5,5])
                .group(reduceOnKey(indepDim, sel.options[sel.selectedIndex].value))
                .title(function(d){
                    return d.data.key
                }),
                dc.lineChart(chart)
                .valueAccessor(accessor.selected)
                .colors('#D32A3E')
                .curve(d3.curveMonotoneX)
                .useRightYAxis(true)
                .renderDataPoints({radius: 3, fillOpacity: 0.8, strokeOpacity: 0.8})
                .group(reduceOnKey(indepDim2, sel2.options[sel2.selectedIndex].value))
            ])
            .yAxisLabel(sel.options[sel.selectedIndex].value + ' (blue area)')
            .rightYAxisLabel(sel2.options[sel2.selectedIndex].value + ' (red line)')
            .on("renderlet", function(chart) {
                chart.selectAll('circle.dot').on('click.section', function(d) {
                    removeHighlights();
                    addHighlights(rawTable, cfTable, d);
                })
            })
            .render()
    }

    var getKeys = function(rawTable) {
        return Object.keys(rawTable[0]);
    }

    var getTotalWords = function(rawTable) {
        return rawTable[(rawTable.length - 1)]["ORIGINAL_SCRIPT_WORD_INDEX"];
    }

    //normal bar graph is the default view
    var chart = dc.barChart("#main-chart");
    var chart2 = dc.compositeChart("#secondary-chart");
    d3.csv("data/data.csv").then(function(rawTable) {
        var cfTable = crossfilter(rawTable);
        var indepDim = independentAxisBar(cfTable, chart, getTotalWords(rawTable));
        var indepDim2 = independentAxisLine(cfTable, chart2, getTotalWords(rawTable));

        var sel = makeDependentSelectorDropdown(
            document.getElementById("dependent-selector"), 
            'dependent-selector-dropdown', 
            getKeys(rawTable)
        );
        sel.addEventListener('change', function() {
            configureMainChart(chart, indepDim, sel, rawTable, cfTable);
            configureSecondaryChart(chart2, indepDim, indepDim2, sel, sel2, rawTable, cfTable);
        });

        var sel2 = makeDependentSelectorDropdown(
            document.getElementById('dependent-selector-2'),
            'dependent-selector-2-dropdown',
            getKeys(rawTable)
        );
        sel2.addEventListener("change", function() {
            configureMainChart(chart, indepDim, sel, rawTable, cfTable);
            configureSecondaryChart(chart2, indepDim, indepDim2, sel, sel2, rawTable, cfTable);
        });

        configureMainChart(chart, indepDim, sel, rawTable, cfTable);
        configureSecondaryChart(chart2, indepDim, indepDim2, sel, sel2, rawTable, cfTable);

        var textBox = document.createElement("input");
        textBox.setAttribute('id', 'filter-text-box');
        textBox.addEventListener("keypress", function(e) {
            if (e.keyCode == 13) {
                var searchTerms = this.value.toLowerCase();
                searchTerms = searchTerms.replace(/^[ \t]+|[ \t]+$/, '');
                filterAxis(cfTable, filterSel.options[filterSel.selectedIndex].value, searchTerms);
                configureMainChart(chart, indepDim, sel, rawTable, cfTable);
                configureSecondaryChart(chart2, indepDim, indepDim2, sel, sel2, rawTable, cfTable);
            }
        });

        var filterSel = makeFilter(document.getElementById("text-search"), textBox, getKeys(rawTable));
        filterSel.addEventListener("change", function() {
            configureMainChart(chart, indepDim, sel, rawTable, cfTable);
            configureSecondaryChart(chart2, indepDim, indepDim2, sel, sel2, rawTable, cfTable);
        });

        // end chart 2

        // FOR BOTH CHARTS
        //weird edge case: if filter by search term, adjust slider, then search something different,
        //filter does not reset -- probably have to reset dim
        var slideWidgetAddInputListener = function(slideWidget) {
            var textBox = document.getElementById('filter-text-box');
            slideWidget.oninput = function () {
                //print current slider value
                var out = document.getElementById('slider-output');
                out.innerHTML = 'Words per script section: ' + this.value;

                var callback = function (binsize) {
                    if (binsize === slideWidget.value) {
                        //remove script section highlighting from previous bin size
                        removeHighlights();
                        
                        indepDim.dispose();
                        indepDim2.dispose();
                        indepDim = independentAxisBar(cfTable, chart, getTotalWords(rawTable), binsize);
                        indepDim2 = independentAxisLine(cfTable, chart2, getTotalWords(rawTable), binsize);

                        configureMainChart(chart, indepDim, sel, rawTable, cfTable);
                        configureSecondaryChart(chart2, indepDim, indepDim2, sel, sel2, rawTable, cfTable);

                        document.getElementById('script').innerHTML = ''; //remove previous version of scriont
                        renderScript(); //rewrite script with new bin size/script section sizes
                    }
                }

                var selection = this.value;
                setTimeout(callback, 1000, selection);
            }
        }

        slideWidgetAddInputListener(document.getElementById('slider-widget'));

        renderScript();

        document.getElementById('smoothing-switch').addEventListener('change', function() {
            var selector = document.getElementById('dependent-selector-dropdown');
            var selector2 = document.getElementById('dependent-selector-2-dropdown');
            
            accessor.toggle();
            configureMainChart(chart, indepDim, sel, rawTable, cfTable);
            configureSecondaryChart(chart2, indepDim, indepDim2, sel, sel2, rawTable, cfTable);
        });

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
                configureMainChart(chart, indepDim, sel, rawTable, cfTable);
                configureSecondaryChart(chart2, indepDim, indepDim2, sel, sel2, rawTable, cfTable);
            } else {                               //from main to 2nd
                main.classList.add('hide');
                alt.classList.remove('hide');
                document.getElementById('dependent-selector-2').removeAttribute('disabled');
                selector2.classList.remove('grey');
                configureMainChart(chart, indepDim, sel, rawTable, cfTable);
                configureSecondaryChart(chart2, indepDim, indepDim2, sel, sel2, rawTable, cfTable);
            }
        });

        document.getElementById('secondary-chart').classList.add('hide'); //default hide double bar graph
        document.getElementById('dependent-selector-2').setAttribute('disabled','disabled');
        document.getElementById('dependent-selector-2-dropdown').classList.add('grey');
    });
})();
