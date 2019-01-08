// var pkg_index   = require('users/kongdd/public:pkg_index.js');

// 620-670nm, RED, sur_refl_b01
// 841-876nm, NIR, sur_refl_b02
// 459-479nm, BLUE, sur_refl_b03
// 1628-1652nm, SWIR, sur_refl_b06
// 
// var img_ref = img.select(['sur_refl_b01', 'sur_refl_b02', 'sur_refl_b03', 'sur_refl_b06'])
//         .rename(['red', 'nir', 'blue', 'swir']).multiply(0.0001);

var pkg_index  = {};

pkg_index.NDVI = function(img){
    return img.expression("(nir-red) / (nir+red)", 
        {nir: img.select('nir'), red: img.select('red')}).rename('NDVI');
};

pkg_index.EVI  = function(img){
    return img.expression("2.5*(nir - red) / (nir + 6*red - 7.5*blue + 1)", 
        {nir: img.select('nir'), red: img.select('red'), blue: img.select('blue')}).rename('EVI');
};

pkg_index.EVI2 = function(img){
    // L is a canopy background adjustment factor.
    return img.expression("2.5*(nir-red) / (nir+red*2.4+1)", 
        {nir: img.select('nir'), red: img.select('red')}).rename('EVI2');
};

pkg_index.LSWI = function(img){
    return img.expression("(nir - swir) / (nir + swir)", 
        {nir: img.select('nir'), swir: img.select('swir')}).rename('LSWI');
};


/**
 * Soil-adjusted vegetation index
 *
 * @param {[type]} img [description]
 * 
 * @references
 * 1. https://en.wikipedia.org/wiki/Soil-adjusted_vegetation_index
 * 2. Huete, A.R., (1988) 'A soil-adjusted vegetation index (SAVI)' 
 *     Remote Sensing of Environment, vol. 25, issue 3, pp. 259-309.
 *     DOI: 10.1016/0034-4257(88)90106-X
 */
pkg_index.SAVI = function(img){
    // L is a canopy background adjustment factor.
    return img.expression("(nir-red)*(1+L)/(nir+red+L)", 
        {nir: img.select('nir'), red: img.select('red'), L:0.5}).rename('SAVI');
};

exports = pkg_index;
