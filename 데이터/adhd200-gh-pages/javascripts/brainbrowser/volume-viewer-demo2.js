/*
* Author: Tarek Sherif <tsherif@gmail.com> (http://tareksherif.ca/)
* Author: Nicolas Kassis
*/

// This script is meant to be a demonstration of how to
// use most of the functionality available in the
// BrainBrowser Volume Viewer.
$(function() {
  "use strict";
  
  $(".button").button();

  /////////////////////////////////////
  // Start running the Volume Viewer
  /////////////////////////////////////
  window.viewer = BrainBrowser.VolumeViewer.start("brainbrowser", function(viewer) {
    var loading_div = $("#loading");

    ///////////////////////////
    // Set up global UI hooks.
    ///////////////////////////


  viewer.updateVoxelCoords = function() {
    var voxel_coords = viewer.volumes[2].position;
    viewer.volumes[0].setVoxelCoords(voxel_coords.xspace, voxel_coords.yspace, voxel_coords.zspace );

    $("#voxel-i-").val(parseInt(voxel_coords.xspace, 10)).change();
    $("#voxel-j-").val(parseInt(voxel_coords.yspace, 10)).change();
    $("#voxel-k-").val(parseInt(voxel_coords.zspace, 10)).change();
    // console.log($("#voxel-i-").val());
    // console.log($("#voxel-j-").val());
    // console.log($("#voxel-k-").val());
  }

  viewer.updateWorldCoords = function(){
    var world_coords = viewer.volumes[0].getWorldCoords();

    $("#world-x-").val(world_coords.x.toPrecision(3));
    $("#world-y-").val(world_coords.y.toPrecision(3));
    $("#world-z-").val(world_coords.z.toPrecision(3));
  }

  viewer.updateIntensity = function(){
    var intensity = viewer.volumes[0].getIntensityValue();
    $('#intensity-value-').html(parseFloat(intensity).toFixed(2));
  }

  viewer.loadData = function() {
    //////////////////////////////////
    // Per volume UI hooks go in here.
    //////////////////////////////////
    viewer.addEventListener("volumeuiloaded", function(event) {
      var container = event.container;
      var volume = event.volume;
      var vol_id = event.volume_id;

      container = $(container);

      container.find(".button").button();


      // Color map URLs are read from the config file and added to the
      // color map select box.
      if(vol_id == 0 && $('#color-map-select').length == 0 ){
        var color_map_select = $('<select id="color-map-select" class="option"></select>').change(function() {
          var selection = $(this).find(":selected");

          viewer.loadVolumeColorMapFromURL(vol_id, selection.val(), selection.data("cursor-color"), function() {
            viewer.redrawVolumes();
          });
        });

        BrainBrowser.config.get("color_maps").forEach(function(color_map) {
          color_map_select.append('<option value="' + color_map.url +
            '" data-cursor-color="' + color_map.cursor_color + '">' +
            color_map.name +'</option>'
          );
        });

        $("#color-map-").append(color_map_select);
      }

      // Change the range of intensities that will be displayed.
      container.find(".threshold-div").each(function() {
        var div = $(this);

        // Input fields to input min and max thresholds directly.
        var min_input = div.find("#min-threshold-");
        var max_input = div.find("#max-threshold-");


        // Slider to modify min and max thresholds.
        var slider = div.find(".slider");

        slider.slider({
          range: true,
          min: volume.intensity_min,
          max: volume.intensity_max,
          values: [volume.intensity_min, volume.intensity_max],
          step: 1,
          slide: function(event, ui){
            var values = ui.values;

            // Update the volume and redraw.
            volume.intensity_min = values[0];
            volume.intensity_max = values[1];
            viewer.redrawVolumes();
          },
          stop: function() {
            $(this).find("a").blur();
          }
        });

        min_input[0].value = volume.intensity_min;
        max_input[0].value = volume.intensity_max;

      });


      // Contrast controls
      container.find(".brightness-div").each(function() {
        var div = $(this);
        var slider = div.find(".slider");
        var brightness_input = div.find("#brightness-val");

        // Slider to select brightness value.
        slider.slider({
          min: 0,
          max: 1,
          step: 0.05,
          value: 0.5,
          slide: function(event, ui) {
            var value = parseFloat(ui.value);
            viewer.volumes[2].blend_ratios = [value, 0.5]
            viewer.redrawVolumes();
            
            brightness_input.val(value);
          },
          stop: function() {
            $(this).find("a").blur();
          }
        });
      });
    //});


      // // Contrast controls
      // container.find(".contrast-div").each(function() {
      //   var div = $(this);
      //   var slider = div.find(".slider");
      //   var contrast_input = div.find("#contrast-val");
      //   // Slider to select contrast value.
      //   slider.slider({
      //     min: 0,
      //     max: 2,
      //     step: 0.05,
      //     value: 1,
      //     slide: function(event, ui) {
      //       var value = parseFloat(ui.value);
      //       viewer.volumes[2].display.setContrast(value);
      //       viewer.volumes[2].display.refreshPanels();
            
      //       contrast_input.val(value);
      //     },
      //     stop: function() {
      //       $(this).find("a").blur();
      //     }
      //   });
      // });


      container.find(".time-div").each(function() {
        var div = $(this);
        
        if ($('#derivative').val() == "dual_regression"){
          div.show();
          
          var slider = div.find(".slider");
          var time_input = div.find("#time-val-");
          var play_button = div.find("#play-");

          var min = 0;
          var max = volume.header.time.space_length - 1;
          var play_interval;
        
          slider.slider({
            min: min,
            max: max,
            value: 0,
            step: 1,
            slide: function(event, ui) {
              var value = +ui.value;
              time_input.val(value);
              volume.current_time = value;
              viewer.redrawVolumes();
            },
            stop: function() {
              $(this).find("a").blur();
            }
          });
          
          time_input.change(function() {
            var value = parseInt(this.value, 10);
            if (!BrainBrowser.utils.isNumeric(value)) {
              value = 0;
            }

            value = Math.max(min, Math.min(value, max));

            this.value = value;
            time_input.val(value);
            slider.slider("value", value);
            volume.current_time = value;
            viewer.redrawVolumes();
          });
          
          play_button.change(function() {
            if(play_button.is(":checked")){
              clearInterval(play_interval);
              play_interval = setInterval(function() {
                var value = volume.current_time + 1;
                value = value > max ? 0 : value;
                volume.current_time = value;
                time_input.val(value);
                slider.slider("value", value);
                viewer.redrawVolumes();
              }, 200);
            } else {
              clearInterval(play_interval);
            }
          });

        }else{div.hide()}

      });
    });

    /////////////////////////////////////////////////////
    // UI updates to be performed after each slice update.
    //////////////////////////////////////////////////////
    viewer.addEventListener("sliceupdate", function(event) {
      var panel = event.target;
      var volume = event.volume;
      var vol_id = panel.volume_id;
      

      if (volume.header && volume.header.time) {
        $("#time-slider-" + vol_id).slider("option", "value", volume.current_time);
        $("#time-val-" + vol_id).val(volume.current_time);
      }
    });

    var color_map_config = BrainBrowser.config.get("color_maps")[0];

    loading_div.show();

    //////////////////////////////
    // Load the default color map.
    //////////////////////////////
    viewer.loadDefaultColorMapFromURL(color_map_config.url, color_map_config.cursor_color);

    ////////////////////////////////////////
    // Set the size of slice display panels.
    ////////////////////////////////////////
    viewer.setDefaultPanelSize(300, 300);

    ///////////////////
    // Start rendering.
    ///////////////////
    viewer.render();

    /////////////////////
    // Load the volumes.
    /////////////////////
    

      viewer.loadVolumes({
        volumes: [
          {
            type: "nifti1",
            nii_url: getDataUrl(),
            template: {
              element_id: "volume-ui-template",
              viewer_insert_class: "volume-viewer-display"
            },
          },
          {
            type: "nifti1",
            nii_url: getFuncMean(),
            template: {
              element_id: "volume-ui-template",
              viewer_insert_class: "volume-viewer-display"
            },
             style : "display : none"
          }
        ],
        overlay: {
          template: {
            element_id: "overlay-ui-template",
            viewer_insert_class: "overlay-viewer-display"
          },
          views: ["xspace", "yspace", "zspace"]
        },
        complete: function() {
          loading_div.hide();
          $("#brainbrowser-wrapper").slideDown({duration: 600});

          viewer.interaction_type = 1;


          viewer.loadVolumeColorMapFromURL(0, 'color-maps/spectral-brainview.txt', "#FF0000", function() {
            viewer.redrawVolumes();
          });

          viewer.loadVolumeColorMapFromURL(1, 'color-maps/gray-scale.txt', "#FF0000", function() {
            viewer.redrawVolumes();
          });

          viewer.updateVoxelCoords();
          viewer.updateWorldCoords();
          viewer.updateIntensity();

          viewer.volumes.forEach(function(volume){
            volume.display.forEach(function(panel) {
              if(panel.axis === "xspace"){
                panel.invert_x = true;
              }
            });
          });

          viewer.volumes[2].display.forEach(function(panel) {
                
            var label = viewer.volumes[0].intensity_max;
            //if(panvol.data){
              var offset = [];
              var size = 0;
              

            for(var i = -size; i <= size; i++){
              for(var j = -size; j <= size; j++){
                for(var k = -size; k <= size; k++){
                  var off = [i, j, k];
                  offset.push(off);
                }
              }
            }
            

            var mousedown = false;

            panel.canvas.addEventListener("mousedown", function () {
              mousedown = true;
              viewer.updateVoxelCoords();
              viewer.updateWorldCoords();
              viewer.updateIntensity();
              
            });

            panel.canvas.addEventListener("mouseup", function () {
              mousedown = false;
            });

            panel.canvas.addEventListener("mousemove", function (event) {
              if(mousedown){
                viewer.updateVoxelCoords();
                viewer.updateWorldCoords();
                viewer.updateIntensity();
              }


            }, false);
          });
        }
      });
    }

  viewer.loadData();
  
  });
});


function loadFile(){
    viewer.clearVolumes();
    viewer.loadData();
}


function getFuncMean(){
  var pipeline = $("#pipeline").val();
  var strategy = $("#strategy").val();
  var derivative = 'func_mean'
  var patient = $("#subject").val();
  var url = 'https://s3.amazonaws.com/fcp-indi/data/Projects/ABIDE_Initiative/Outputs/'+ pipeline +'/' + strategy + '/'+ derivative +'/' + patient + '_'+ derivative +'.nii.gz';
  return url;
}

function getDataUrl(){
  var pipeline = $("#pipeline").val();
  var strategy = $("#strategy").val();
  var derivative = $("#derivative").val();
  var patient = $("#subject").val();
  var url = 'https://s3.amazonaws.com/fcp-indi/data/Projects/ABIDE_Initiative/Outputs/'+ pipeline +'/' + strategy + '/'+ derivative +'/' + patient + '_'+ derivative +'.nii.gz';
  return url;
}