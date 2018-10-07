// var pkg_VI   = require('users/kongdd/public:pkg_VI.js');

// 620-670nm, RED, sur_refl_b01
// 841-876nm, NIR, sur_refl_b02
// 459-479nm, BLUE, sur_refl_b03
// 1628-1652nm, SWIR, sur_refl_b06
// 
// var img_ref = img.select(['sur_refl_b01', 'sur_refl_b02', 'sur_refl_b03', 'sur_refl_b06'])
//         .rename(['red', 'nir', 'blue', 'swir']).multiply(0.0001);

var pkg_VI  = {};
pkg_VI.NDVI = function(img){
    return img.expression("(b('nir')-b('red'))/(b('nir')+b('red'))").rename('NDVI');
}

pkg_VI.EVI  = function(img){
    return img.expression("2.5*(b('nir') - b('red')) / (b('nir') + 6*b('red') - 7.5*b('blue') + 1)").rename('EVI');
}

pkg_VI.LSWI = function(img){
    return img.expression("(b('nir') - b('swir')) / (b('nir') + b('swir'))").rename('LSWI');
}

exports = pkg_export;
