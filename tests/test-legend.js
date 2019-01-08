var pkg_vis  = require('users/kongdd/public:pkg_vis.js');

// gradient legend

var vis_vi   = {min: 0, max: 5000, palette:pkg_vis.colors.RdYlGn[11]};
var vis_diff = {min: 0, max: 1000, palette:pkg_vis.colors.RdBu[11]};

var lg_vi    = pkg_vis.grad_legend(vis_vi  , 'VI', false), 
    lg_diff  = pkg_vis.grad_legend(vis_diff, 'diff', false); 


// discrete legend
var lc_colors_005 = ["#aec3d6", "#162103", "#235123", "#399b38", "#38eb38", "#39723b", 
    "#6a2424", "#c3a55f", "#b76124", "#d99125", "#92af1f", "#10104c", 
    "#cdb400", "#cc0202", "#332808", "#d7cdcc", "#f7e174", "#743411"];
var lc_names_005 = ['WATER', 'ENF', 'EBF', 'DNF', 'DBF', 'MF', 
    'CSH', 'OSH', 'WSA', 'SAV', 'GRA', 'WET', 
    'CRO', 'URB', 'CNV', 'SNOW', 'BSV', 'UNC'];

var lc_colors_006 = ["#743411", "#162103", "#235123", "#399b38", "#38eb38", "#39723b", 
    "#6a2424", "#c3a55f", "#b76124", "#d99125", "#92af1f", "#10104c", 
    "#cdb400", "#cc0202", "#332808", "#d7cdcc", "#f7e174", "#aec3d6"];
var lc_names_006 = ['UNC', 'ENF', 'EBF', 'DNF', 'DBF', 'MF', 
    'CSH', 'OSH', 'WSA', 'SAV', 'GRA', 'WET', 
    'CRO', 'URB', 'CNV', 'SNO', 'BSV', 'WATER'];
var lg_lc005 = pkg_vis.discrete_legend(lc_names_005, lc_colors_005, 'MCD12Q1_005', false); //add legend
var lg_lc006 = pkg_vis.discrete_legend(lc_names_006, lc_colors_006, 'MCD12Q1_006', false); //add legend

// add legends together
pkg_vis.add_lgds([lg_lc005, lg_lc006, lg_vi, lg_diff]);
