## GEE packages

By Dongdong Kong, Sun Yat-sen University

## Functions

- pkg_smooth.js
    1. `linearInterp` Linear Interpolation
    2. `historyInterp` History average Interpolation
    3. `wBisquare_array` Bisquare weights updating function

- pkg_export.js
    1. `ExportImg_deg` Export ee.Image in degree   
        `ExportImg_deg(Image, task, range, cellsize, type, folder, crs, crsTransform)`
    2. `ExportImgCol` Export ee.ImageCollection.Suggest combining with [gee_monkey](https://github.com/kongdd/gee_monkey).   
        `ExportImgCol(ImgCol, dateList, range, cellsize, type, folder, crs, crsTransform, prefix)`

- pkg_vis.js
    1. `grad_legend` Generate gradient legend.   
    `grad_legend(viz, title, IsPlot, position)`
    2. `discrete_legend` Generate discrete legend.   
    `discrete_legend(names, palette, title, IsPlot, position)`
    3. `layout` like `layout` function in R. Generate multiple maps.
    
## Usage

Accept this [repository](https://code.earthengine.google.com/?accept_repo=users/kongdd/public) first.

Just take show legends and linear interpolation as example:

### Show legends
```javascript   
var pkg_vis  = require('users/kongdd/public:pkg_vis.js');

var vis_vi   = {min: 0, max: 5000, palette:pkg_vis.colors.RdYlGn[11]};
var vis_diff = {min: 0, max: 1000, palette:pkg_vis.colors.RdBu[11]};

var lg_vi    = pkg_vis.grad_legend(vis_vi  , 'VI', false), 
    lg_diff  = pkg_vis.grad_legend(vis_diff, 'diff', false); 

pkg_vis.add_lgds([lg_vi, lg_diff]);
```

### [Linear Interpolation](https://code.earthengine.google.com/3b08f56a5f646104c742be584877e94e)
```javascript
var pkg_smooth = require('users/kongdd/public:Math/pkg_smooth.js');
var pkg_vis    = require('users/kongdd/public:pkg_vis.js');

function mask_bads(img){
    var qc = img.select('SummaryQA');
    // only good and marginal value left
    return img.select(0).updateMask(qc.lte(1)); 
}

// imgcol_raw should only one bands. Must have `system:time_start` prob
var imgcol_raw = imgcol.select(['EVI', 'SummaryQA']).map(mask_bads);

// frame-day window before and after the current point is used to 
// seach the nearenearest valid good values. Then used the, 
// nearest valid good values to linear linterpolation.
var frame  = 16*3; 
var nodata = -9999; // missing values. It's crucial. Has to been given.

// two bands return: [band, qc];
// qc: 1 means linear interpolation; 0 means not;
var imgcol_sm = pkg_smooth.linearInterp(imgcol_raw, frame, nodata);

// visualization
var vis_vi = {min: 0, max: 6000, bands:"EVI", palette:pkg_vis.colors.RdYlGn[11]};
var lg_vi  = pkg_vis.grad_legend(vis_vi  , 'EVI (1e4)', true); 
// print(imgcol_raw)
// print(imgcol_sm);
Map.addLayer(imgcol_raw, vis_vi, 'original imgcol');
Map.addLayer(imgcol_sm, vis_vi,  'smoothed imgcol');
```
