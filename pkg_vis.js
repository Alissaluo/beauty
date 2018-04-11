// var pkg_vis   = require('users/kongdd/public:pkg_vis.js');

/**
 * [series description]
 *
 * Show the mean values of input region, and click data points and draw the corresponding 
 * date image.
 * 
 * @param  {[type]} ImgCol    [description]
 * @param  {[type]} vis       [description]
 * @param  {[type]} name      [description]
 * @param  {[type]} region    [description]
 * @return {[type]}           [description]
 */
function series(ImgCol, vis, name, region, label) {
    var img = ee.Image(ImgCol.first());
    Map.addLayer(img, vis, name);

    var chart = ui.Chart.image.series({
        imageCollection: ImgCol, //['ETsim', 'Es', 'Eca', 'Ecr', 'Es_eq']
        region         : region,
        reducer        : ee.Reducer.mean(),
        scale          : 2000
    });

    // When the chart is clicked, update the map and label.
    chart.onClick(function(xValue, yValue, seriesName) {
        if (!xValue) return; // Selection was cleared.
        var datestr   = (new Date(xValue)).toUTCString();
        chart.setOptions({title: datestr});
        // Show the image for the clicked date.
        var equalDate = ee.Filter.equals('system:time_start', xValue);

        var img   = ee.Image(ImgCol.filter(equalDate).first());
        var Layer = ui.Map.Layer(img, vis, name);
        Map.layers().reset([Layer]);
        
        // Show a label with the date on the map.
        if (typeof label !== undefined){
            label.setValue(ee.Date(xValue).format('yyyy-MM-dd').getInfo()); //.toUTCString(), E, 
        }
    });

    // Add the chart to the map.
    chart.style().set({ position: 'bottom-right', width: '500px', height: '300px' });    
    Map.add(chart);
}

/** add gradient legend in GEE */
function grad_legend(viz, title, IsPlot) {
    if (typeof title  === 'undefined') title = '';
    if (typeof IsPlot === 'undefined') IsPlot = true;
    
    // If have band information in viz, then remove it.
    if (Object.keys(viz).length > 3){
        viz = ee.Dictionary(viz).remove(['bands']).getInfo();
    }

    var legend = ui.Panel({
        style: { position: 'bottom-left', padding: '2px 6px' }
    });
    var legendTitle = ui.Label({
        value: title,
        style: {
            fontWeight: 'bold', fontSize: '12px',
            margin: '0 0 0 0', padding: '0'
        }
    });
    legend.add(legendTitle);

    /** create the legend image */
    var lat = ee.Image.pixelLonLat().select('latitude');
    var gradient = lat.multiply((viz.max - viz.min) / 100.0).add(viz.min);
    var legendImage = gradient.visualize(viz);

    var panel_max = ui.Panel({
        widgets: [ui.Label(viz.max)],
        style: { fontSize: '14px', margin: '0 0 0px 0', padding: '0 0 0 6px' }
    });
    legend.add(panel_max);
    // create thumbnail from the image
    var thumbnail = ui.Thumbnail({
        image: legendImage,
        params: { bbox: '0, 0, 20, 100', dimensions: '20x200' },
        style: { padding: '0 0 0 10px', position: 'bottom-center', margin: '0 0 0px 0' }
    });
    legend.add(thumbnail);
    // create text on bottom of legend
    var panel_min = ui.Panel({
        widgets: [ui.Label(viz.min)],
        style: { fontSize: '14px', margin: '0 0 0px 0', padding: '0 0 0 6px' }
    });
    legend.add(panel_min);
    if (IsPlot){
        Map.add(legend);
    }else{
        return legend;
    }
}

function discrete_legend(names, palette, title, IsPlot) {
    if (typeof title  === 'undefined') title = 'legend';
    if (typeof IsPlot === 'undefined') IsPlot = true;
    // Display a legend explaining the colors assigned to a MODIS land cover
    // classification image.

    // Create the panel for the legend items.
    var legend = ui.Panel({
        style: { position: 'bottom-left', padding: '8px 15px'}
    });

    // Create and add the legend title.
    var legendTitle = ui.Label({
        value: title,
        style: {
            fontWeight: 'bold', fontSize: '14px',
            margin: '0 0 4px 0', padding: '0'
        }
    });
    legend.add(legendTitle);

    var loading = ui.Label('Loading legend...', { margin: '2px 0 4px 0' });
    legend.add(loading);

    // Creates and styles 1 row of the legend.
    var makeRow = function(color, name) {
        // Create the label that is actually the colored box.
        var colorBox = ui.Label({
            style: {
                backgroundColor: color,
                // Use padding to give the box height and width.
                margin: '0 0 2px 0', padding: '8px'
            }
        });
        // Create the label filled with the description text.
        var description = ui.Label({ value: name, style: { margin: '0 0 4px 6px' } });
        return ui.Panel({
            widgets: [colorBox, description],
            layout: ui.Panel.Layout.Flow('horizontal')
        });
    };

    // Get the list of palette colors and class names from the image.
    loading.style().set('shown', false);
    for (var i = 0; i < names.length; i++) 
        legend.add(makeRow(palette[i], names[i]));
    
    if (IsPlot) {
        Map.add(legend);// Add the legend to the map.
    } else {
        return legend;
    }
}

function add_lgds(lgds) {
    lgds = ui.Panel({
        widgets: lgds,
        layout: ui.Panel.Layout.Flow('horizontal'),
        style: { fontSize: '14px', margin: '0 0 0px 0', padding: '0 0 0 6px', position: 'bottom-left' }
    });
    return lgds;
}

exports = {
    series         : series,
    grad_legend    : grad_legend,
    discrete_legend: discrete_legend,
    add_lgds       : add_lgds,
};
