"use strict"

// rewrite original process function and modified two section
// 1 rewrite the dispatchEvent section: use batch export instead of one by one export 
// 2 remove all non-barcode related codes
ARController.prototype.process = function (image) {
  this.detectMarker(image);

  var markerNum = this.getMarkerNum();
  var k, o;
  for (k in this.barcodeMarkers) {
    o = this.barcodeMarkers[k];
    o.inPrevious = o.inCurrent;
    o.inCurrent = false;
  }

  var i, j, visible;
  var arMarkerArr = []

  for (i = 0; i < markerNum; i++) {
    var markerInfo = this.getMarker(i);

    var markerType = artoolkit.UNKNOWN_MARKER;
    visible = this.trackPatternMarkerId(-1);

    if (markerInfo.idMatrix > -1) {
      visible = this.trackBarcodeMarkerId(markerInfo.idMatrix);
      markerType = artoolkit.BARCODE_MARKER;
    }

    if (markerType !== artoolkit.UNKNOWN_MARKER && visible.inPrevious) {
      this.getTransMatSquareCont(i, visible.markerWidth, visible.matrix, visible.matrix);
    } else {
      this.getTransMatSquare(i, visible.markerWidth, visible.matrix);
    }

    visible.inCurrent = true;
    this.transMatToGLMat(visible.matrix, this.transform_mat);

    // only export barcode and valid ar-marker
    if (markerInfo.idMatrix > -1) {
      arMarkerArr.push({
        index: i,
        type: markerType,
        marker: this.cloneMarkerInfo(markerInfo),              // default deep copy
        matrix: JSON.parse(JSON.stringify(this.transform_mat)) // same as deep copy
      })
    }
  }

  // after all transferred, then export together
  this.dispatchEvent({
    name: 'getMarker',
    target: this,
    data: arMarkerArr
  });
};

// register the application module
b4w.register("IKEA_Lego_b4w_main", function(exports, require) {

// import modules used by the app
var m_app       = require("app");
var m_main       = require("main");
var m_cfg       = require("config");
var m_data      = require("data");
var m_preloader = require("preloader");
var m_ver       = require("version");
var m_mouse     = require("mouse");
var m_scenes    = require("scenes");
var m_material  = require("material");
var m_geom      = require("geometry");
var m_TSR       = require("tsr");
var m_util      = require("util");
var m_quat      = require("quat");
var m_trans     = require("transform");
var m_vec3      = require("vec3");

// detect application mode
var DEBUG = (m_ver.type() == "DEBUG");

// automatically detect assets path
var APP_ASSETS_PATH = m_cfg.get_assets_path("IKEA_Lego_b4w");

var color_profiles = [{name: "VEDDINGE", materialID: ['MAT003015V1', 'MAT003775V1'] },
{name: "BODBYN OFF-WHITE", materialID: ['MAT000169V1', 'MAT003775V1'] },
{name: "BODBYN GRY", materialID: ['MAT005966V1', 'MAT003775V1'] },
{name: "KALLARP BLUE", materialID: ['MAT001568V1', 'MAT003775V1'] },
{name: "HAGGEBY", materialID: ['MAT004366V1', 'MAT003775V1'] },
{name: "TORHAMN", materialID: ['MAT008896V1', 'MAT008897V1'] },
{name: "HITTARP", materialID: ['MAT000169V1', 'MAT003775V1'] },
{name: "TINGRSRYD BLK", materialID: ['MAT006103V1', 'MAT003775V1'] },
{name: "LAXARBY", materialID: ['MAT004237V1', 'MAT003775V1'] },
{name: "RINGHULT WHI", materialID: ['MAT005104V1', 'MAT003824V1'] },
{name: "RINGHULT GRY", materialID: ['MAT001453V1', 'MAT000310V1'] },
{name: "VOXTORP", materialID: ['MAT008439V1', 'MAT003775V1'] },
  { name: "EDSERUM", materialID: ['MAT006102V1', 'MAT003775V1'] },
  { name: "LERHTTYAN GRY", materialID: [''] },
  { name: "LERHTTYAN BLK", materialID:['']},
];

var markerMapping = [];
var boundings = [];
var materiaLib;
var curProfile = 'VEDDINGE';
var cam_deviceId;
var selected_id = -1;
var selectionBox;
var lastStaticTime = -1;
var zoneLineObj;

/**
 * export the method to initialize the app (called at the bottom of this file)
 */
exports.init = function (camera_id) {
    cam_deviceId = camera_id;
    m_cfg.set("quality", m_cfg.P_ULTRA);
    m_cfg.set("canvas_resolution_factor", 1.5);
    m_app.init({
        canvas_container_id: "main_canvas_container",
        callback: init_cb,
        show_fps: DEBUG,
        console_verbose: DEBUG,
        autoresize: true
    });
    m_main.set_render_callback(render_cb);
}

exports.load_asset = function(name, marker_id){
  var obj = markerMapping.find((ele)=>(ele.marker_id == marker_id));
  if (obj == null) return;
  if (exports.preload_cb != null)
  {
    exports.preload_cb(marker_id);
  }
  if (obj.data_id == -1)
  {
    var filename = "assets/assets/" + name.toUpperCase() + ".json";
    m_data.load(filename, load_cb, null, false, false);
  }
  else
  {
    load_cb(obj.data_id, true);
  }
}

exports.unload_asset = function(data_id, force)
{
  var obj = markerMapping.find((ele)=>(ele.data_id == data_id));
  obj.loaded = -1;
  obj.last_seen_time = -Infinity;

  var objs = m_scenes.get_all_objects("ALL", data_id);
  for (var i = 0; i < objs.length; i++) {
    m_scenes.hide_object(objs[i]);
  }

  if (force)
  {
    var index = boundings.findIndex((ele) => (ele.data_id == data_id));
    boundings.splice(index, 1);
    if (data_id >= 0)
    {
        m_data.unload(data_id);
    }
    obj.data_id = -1;
  }
  if (obj.marker_id == selected_id)
  {
    m_scenes.hide_object(selectionBox);
  }

  if (exports.unload_cb != null)
  {
      exports.unload_cb(obj.marker_id);
  }
}

exports.get_name = function(obj)
{
    return m_scenes.get_object_name(obj);
}

exports.change_floor = function(srcName, matName){
    var objFloor = m_scenes.get_object_by_name("Floor");
    var objSrc = m_scenes.get_object_by_name(srcName);
    m_material.inherit_material(objSrc, matName, objFloor, "Floor");
}

exports.summerizeSceneBB = function ()
{
  if (boundings.length == 0) return;
  var minX = 10000.0;
  var minY = 10000.0;
  var maxX = -10000.0;
  var maxY = -10000.0;
  var validobjs = 0;
  boundings.forEach(bb => {
    var mappingobj = markerMapping.find((mapele) => (mapele.data_id == bb.data_id));
    if (mappingobj.loaded == 1) {
      minX = Math.min(minX, bb.obb[0], bb.obb[3], bb.obb[6], bb.obb[9]);
      minY = Math.min(minY, bb.obb[1], bb.obb[4], bb.obb[7], bb.obb[10]);
      maxX = Math.max(maxX, bb.obb[0], bb.obb[3], bb.obb[6], bb.obb[9]);
      maxY = Math.max(maxY, bb.obb[1], bb.obb[4], bb.obb[7], bb.obb[10]);
      ++validobjs;
    }
  });
  if (zoneLineObj == null
    || validobjs == 0) return;
  var zoneVerts = new Float32Array(
    [ minX, minY, 0,
      maxX, minY, 0,
      maxX, maxY, 0,
      minX, maxY, 0,
      minX, minY, 0] );
  m_geom.draw_line(zoneLineObj, zoneVerts);
  m_material.set_line_params(zoneLineObj,
    {
      color: new Float32Array([1.0, 0.0, 0.0, 0.3]),
      width: 5
    });
  var wAnchor = m_scenes.get_object_by_name("anchor_width");
  m_trans.set_translation(wAnchor, (maxX + minX) / 2, maxY + 0.1, 0);
  var hAnchor = m_scenes.get_object_by_name("anchor_height");
  m_trans.set_translation(hAnchor, minX - 0.2, (maxY + minY) / 2, 0);

  m_scenes.show_object(zoneLineObj);
  exports.scene_region_update_cb(maxX - minX, maxY - minY, true);
}
  
exports.setZoneHeight = function(value)
{
  zoneHeight = value;
  //createLimitZone(zoneWidth, zoneHeight);
}

exports.setZoneWidth = function(value)
{
  zoneWidth = value;
  //createLimitZone(zoneWidth, zoneHeight);
}

exports.getZoneHeight = function()
{
  return zoneHeight;
}

exports.getZoneWidth = function()
{
  return zoneWidth;
}

exports.setCameraHeight = function(value)
{
  cameraHeight = value;
}

exports.getCameraHeight = function()
{
  return cameraHeight;
}

exports.setCameraWidth = function(value)
{
  cameraWidth = value / 2;
}

exports.getCameraWidth = function()
{
  return cameraWidth * 2;
}

function apply_materials(objs)
{
  objs.forEach(obj=>{
    var mtlNames = m_material.get_materials_names(obj);
    mtlNames.forEach(destMtlName=>{
      var srcMtlName = null;
      //for (var i = 0; i < destMtls.length; ++i){
      //  var dstID = destMtls[i];
      //  if (destMtlName.substring(0, 11) == dstID) {
      //    //Apply door's material to current profile
      //    srcMtlName = materiaLib.Materials.find(ele=>(ele.substring(0, 11) == proMtls[i]));
      //  }
      //}

      //if (srcMtlName == null)
      //{
      //  //Apply other materials from material Lib
      //  var ID = destMtlName.substring(0, 11);
      //  srcMtlName = materiaLib.Materials.find(ele=>ele.substring(0, 11) == ID);
      //}
      var ID = destMtlName.substring(0, 11);
      srcMtlName = materiaLib.Materials.find(ele => ele.substring(0, 11) == ID);
      if (srcMtlName != null) {
        m_material.inherit_material(materiaLib.Object, srcMtlName, obj, destMtlName);
      }
      else {
        console.log("material not found: " + destMtlName);
        m_material.inherit_material(materiaLib.Object, "default", obj, destMtlName);
      }
    });
  });
}

exports.change_profile = function(profileName){
  boundings.forEach(ele => {
    var mappingobj = markerMapping.find((mapele) => (mapele.data_id == ele.data_id));
    if (ele.data_id > 0 && mappingobj.loaded == 1) {
      var objects = m_scenes.get_all_objects("ALL", ele.data_id);
      //apply_profile(objs);
      for (var key in objects)
      {
        var obj = objects[key];
        var objName = m_scenes.get_object_name(obj);
        if (objName == curProfile)
        {
          m_scenes.hide_object(obj);
        }
        if (objName == profileName)
        {
          m_scenes.show_object(obj);
        }
      }
    }
  });
  curProfile = profileName;
}


exports.setMarkerMapping = function(path, marker_id, default_rot){
  var data = markerMapping.find(ele=>(ele.marker_id == marker_id));
  if (data == null)
  {
    if (default_rot == null) default_rot = 0;
    markerMapping.push({marker_id: marker_id, init_rot: default_rot, filename : path, loaded: -1, data_id: -1, last_seen_time: -Infinity});
  }
  else if (data.filename != path)
  {
    data.filename = path;
    exports.unload_asset(data.data_id, true); 
  }
}

exports.selected_cb = function(id){};
exports.preload_cb = function(marker_id){};
exports.postload_cb = function(marker_id){};
exports.unload_cb = function (marker_id) { };
exports.ontap_cb = function () { };
exports.scene_region_update_cb = function (width, height, visible) { };
exports.changeColor = function(color){
  boundings.forEach(ele=>{
    if (ele.data_id > 0)
    {
      var objs = m_scenes.get_all_objects("MESH", ele.data_id);
      objs.forEach(obj=>{
        var mtlNames = m_material.get_materials_names(obj);
        mtlNames.forEach(mtl=>{
          if (mtl.substring(0, 11) == "MAT003015V1")
          {
            m_material.set_diffuse_color(obj, mtl, color)
          }
        });
      });
    }
  });
};

function createLimitZone(width, depth){
  if (zoneLineObj == null) return;
  var zoneVerts = new Float32Array(
      [-width/2, 0, 0,
      width/2, 0, 0,
      width/2, depth, 0,
      -width/2, depth, 0,
      -width/2, 0, 0]);
  m_geom.draw_line(lineObj, zoneVerts);
  m_material.set_line_params(lineObj, 
      {color: new Float32Array([1.0, 0.0, 0.0, 0.3]), 
      width: 5
    });

  create_boundings(0, -width / 2, 0, 0, width / 2, depth, 0);
}
function create_boundings(data_id, min_x, min_y, min_z, max_x, max_y, max_z)
{
  var mid = -1;
  var dataobj = markerMapping.find((ele)=>(ele.data_id == data_id));
  if (dataobj != null)
  {
    mid = dataobj.marker_id;
  }
  var obj = {data_id: data_id,
              marker_id: mid, 
              lastPosition: [0, 0, 0],
              lastRotation: 0,
              static_count: 100,
              local_bounds:[
                min_x, min_y, min_z,
                max_x, max_y, max_z],
              obb:[min_x, min_y, 0,
                max_x, min_y, 0,
                max_x, max_y, 0,
                min_x, max_y, 0]};
  boundings.push(obj);
}

function update_boundings(marker_id, tsr)
{
  var obj = boundings.find((ele)=>(ele.marker_id == marker_id));
  if (obj == null)
  {
    return;
  }
  obj.obb = new Float32Array(12);
  m_TSR.transform_vectors([obj.local_bounds[0], obj.local_bounds[1], obj.local_bounds[2], 
                           obj.local_bounds[3], obj.local_bounds[1], obj.local_bounds[2], 
                           obj.local_bounds[0], obj.local_bounds[4], obj.local_bounds[5],
                           obj.local_bounds[3], obj.local_bounds[4], obj.local_bounds[5]],
    tsr,
    obj.obb);
}

/**
 * callback executed when the app is initialized 
 */
function init_cb(canvas_elem, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }

    

    m_preloader.create_preloader();

    // ignore right-click on the canvas element
    canvas_elem.oncontextmenu = function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };

    canvas_elem.addEventListener("mousedown", main_canvas_down);
    canvas_elem.addEventListener("touchstart", main_canvas_down);

    canvas_elem.addEventListener("mouseup", main_canvas_up);
    canvas_elem.addEventListener("touchend", main_canvas_up);

    canvas_elem.addEventListener("mousemove", main_canvas_move);
    canvas_elem.addEventListener("touchmove", main_canvas_move);

    load();

}

/**
 * load the scene data
 */
function load() {
    m_data.load("assets/assets/Kitchen/Ikea_kitchen.json", load_cb, preloader_cb);
}

/**
 * update the app's preloader
 */
function preloader_cb(percentage) {
    m_preloader.update_preloader(percentage);
}

function mergeBox(op1, op2){
  if (op1 == null) return op2;
  if (op2 == null) return op1;
  var dest = new Object;
  dest.min_x = Math.min(op1.min_x, op2.min_x);
  dest.min_y = Math.min(op1.min_y, op2.min_y);
  dest.min_z = Math.min(op1.min_z, op2.min_z);
  dest.max_x = Math.max(op1.max_x, op2.max_x);
  dest.max_y = Math.max(op1.max_y, op2.max_y);
  dest.max_z = Math.max(op1.max_z, op2.max_z);
  return dest;
}

/**
 * callback executed when the scene data is loaded
 */
function load_cb(data_id, success) {

    if (!success) {
        console.log("b4w load failure");
        return;
    }

    m_app.enable_camera_controls();

    if (loadingIndex >= 0) {
      markerMapping[loadingIndex].data_id = data_id;
      markerMapping[loadingIndex].loaded = 1;
      loadingIndex = -1;
    }

    // place your code here
    var objs = m_scenes.get_all_objects("MESH", data_id);
    var bounds = boundings.find((ele)=>(ele.data_id == data_id));
    var coldLoading = (bounds == null);
    objs.forEach(obj=>{
        if (data_id > 0 && coldLoading)
        {
          var objBox = m_trans.get_object_bounding_box(obj);
          bounds = mergeBox(bounds, objBox);
        }
    });
    if (coldLoading && bounds)
    {
      create_boundings(data_id, bounds.min_x, bounds.min_y, bounds.min_z, bounds.max_x, bounds.max_y, bounds.max_z);
    }    

    if (exports.postload_cb != null)
    {
        var obj = markerMapping.find(ele=>(ele.data_id == data_id));
        if (obj)
        {
          exports.postload_cb(obj.marker_id);
        }
    }

    if (data_id == 0)
    {
        //createLimitZone(4, 2.5);
        objs.forEach(ele=>{
          var objName = m_scenes.get_object_name(ele);
          if (objName == "MaterialLib")
          {
            var mtlNames = m_material.get_materials_names(ele);
            materiaLib = {Object: ele, 
              Materials: mtlNames};
          }
        });
        selectionBox = m_scenes.get_object_by_name("SelectionBox");
        zoneLineObj = m_scenes.get_object_by_name("LimitZone");
        initArMarkerTracking();
    }
    else if (coldLoading)
    {
      apply_materials(objs);
    }
    else {
      objs = m_scenes.get_all_objects("EMPTY", data_id);
      for (var i = 0; i < objs.length; ++i) {
         var found = false;
         var name = m_scenes.get_object_name(objs[i]);
         if (color_profiles.find(ele => (ele.name == name))) {
            m_scenes.hide_object(objs[i]);
            continue;
         }
         m_scenes.show_object(objs[i]);
      }
    }
  exports.change_profile(curProfile);
}

function draw_selection_box(marker_id)
{
  var index = markerMapping.findIndex((ele)=>(ele.marker_id == marker_id));
  if (index < 0) return;
  var srcObj = markerMapping[index];
  var bound = boundings.find(ele=>(ele.marker_id == marker_id));
  m_trans.set_translation(selectionBox, bound.lastPosition[0], bound.lastPosition[1], bound.lastPosition[2]);
  m_trans.set_rotation_euler(selectionBox, bound.lastRotation[0], bound.lastRotation[1], bound.lastRotation[2]);
  var minx = bound.local_bounds[0] * 1.1;
  var miny = bound.local_bounds[1] * 1.1;
  var minz = bound.local_bounds[2];
  var maxx = bound.local_bounds[3] * 1.1;
  var maxy = bound.local_bounds[4] * 1.1;
  var maxz = bound.local_bounds[5];
  var verts = new Float32Array(
    [minx, miny, minz,
     maxx, miny, minz,

     maxx, miny, minz,
     maxx, maxy, minz,
    
     maxx, maxy, minz,
     minx, maxy, minz,

     minx, maxy, minz,
     minx, miny, minz,
    
     minx, miny, maxz,
     maxx, miny, maxz,

     maxx, miny, maxz,
     maxx, maxy, maxz,
    
     maxx, maxy, maxz,
     minx, maxy, maxz,

     minx, maxy, maxz,
     minx, miny, maxz,

     minx, miny, minz,
     minx, miny, maxz,

     maxx, miny, minz,
     maxx, miny, maxz,
    
     maxx, maxy, minz,
     maxx, maxy, maxz,

     minx, maxy, minz,
     minx, maxy, maxz,
    ]
    );
    m_geom.draw_line(selectionBox, verts, true);
    m_material.set_line_params(selectionBox, 
        {color: new Float32Array([0, 0, 1.0, 0.3]), 
        width: 5
      });
  m_scenes.show_object(selectionBox);
}

function main_canvas_down(e) {
    if (e.preventDefault)
    e.preventDefault();
    var x = m_mouse.get_coords_x(e);
    var y = m_mouse.get_coords_y(e);

    var obj = m_scenes.pick_object(x, y);
    if (obj && exports.selected_cb != null)
    {
        var id = m_scenes.get_object_data_id(obj);
        var dataobj = markerMapping.find((ele)=>(ele.data_id == id));
        exports.selected_cb(dataobj.marker_id);
        draw_selection_box(dataobj.marker_id);
        selected_id = dataobj.marker_id;
    }
    else
    {
      exports.selected_cb(-1);
      selected_id = -1;
      m_scenes.hide_object(selectionBox);
    }
  }

  function main_canvas_up(e) {
    if (exports.ontap_cb != null) {
      exports.ontap_cb();
    }
  }

  function main_canvas_move(e) {
  }

function PointOnLine(a, b, p, pOut)
{
  var ab = m_vec3.create();
  m_vec3.sub(b, a, ab);
  var ac = m_vec3.create();
  m_vec3.sub(p, a, ac);
  var f = ab[0] * ac[0] + ab[1] * ac[1];
  var d = ab[0] * ab[0] + ab[1] * ab[1];
  f = f/d;
  m_vec3.scaleAndAdd(a, ab, f, pOut);
  return f > -0.2 && f < 1.2;
}

function SnapLine(a, b, p)  // a和b是线段的两个端点， c是检测点
{
  return m_vec3.distance(p, D);
}

var snapTreshHold = 0.05;

function snapBoundings(marker_id, snapPos, snapRot)
{
  var obj = boundings.find((ele)=>(ele.marker_id == marker_id));
  if (obj == null) return false;
  var corners = [[obj.obb[0], obj.obb[1], 0],
  [obj.obb[3], obj.obb[4], 0],
  [obj.obb[6], obj.obb[7], 0],
  [obj.obb[9], obj.obb[10], 0]];
  var foundSnap = false;
  boundings.forEach((ele)=>{
    if (ele.marker_id != marker_id && ele.static_count > 30) {
      var edges = [{p0: [ele.obb[0], ele.obb[1], 0], p1: [ele.obb[3], ele.obb[4], 0], snapPt: []},
      {p0: [ele.obb[3], ele.obb[4], 0], p1: [ele.obb[6], ele.obb[7], 0], snapPt: []},
      {p0: [ele.obb[6], ele.obb[7], 0], p1: [ele.obb[9], ele.obb[10], 0], snapPt: []},
      {p0: [ele.obb[9], ele.obb[10], 0], p1: [ele.obb[0], ele.obb[1], 0], snapPt: []}];
      edges.forEach((edge)=>{
        var cornerIdx = 0;
        corners.forEach((corner) => {
          var projOnLine = m_vec3.create();
          if (PointOnLine(edge.p0, edge.p1, corner, projOnLine))
          {
            var dist = m_vec3.distance(corner, projOnLine);
            if (dist < snapTreshHold)
            {
              edge.snapPt.push({position: projOnLine, index: cornerIdx});
            }
          }
          cornerIdx++;
        });
      });
      var edgeIdx = 0;
      edges.forEach((edge)=>{
        if (edge.snapPt.length >= 2){
          var edgeDir = m_vec3.create();
          var snapDir = m_vec3.create();
          var rotAxis = m_vec3.create();
          m_vec3.sub(edge.p1, edge.p0, edgeDir);
          m_vec3.normalize(edgeDir, edgeDir);
          m_vec3.sub(corners[edge.snapPt[1].index], corners[edge.snapPt[0].index], snapDir);
          m_vec3.normalize(snapDir, snapDir);
          var angle = m_vec3.angle(snapDir, edgeDir);
          m_vec3.cross(snapDir, edgeDir, rotAxis);
          if (angle > Math.PI / 2)
          {
            angle -= Math.PI;
          }
          angle *= -Math.sign(rotAxis[2]);
          snapRot[2] = angle;

          var projOnBound = m_vec3.create();
          var projOnEdge = m_vec3.create();
          PointOnLine(corners[edge.snapPt[0].index], corners[edge.snapPt[1].index], snapPos, projOnBound);
          PointOnLine(edge.p0, edge.p1, snapPos, projOnEdge);
          var distToBound = m_vec3.distance(projOnBound, snapPos);
          var distToEdge = m_vec3.distance(projOnEdge, snapPos);
          var distToMove = distToEdge - distToBound;
          var localVec = m_vec3.create();
          m_vec3.sub(projOnEdge, snapPos, localVec);
          m_vec3.normalize(localVec, localVec);
          m_vec3.scaleAndAdd(snapPos, localVec, distToMove, snapPos);
          foundSnap = true;
        }
        edgeIdx++;
      });
    }
  });
  return foundSnap;
}


var loadingIndex = -1;
var zoneWidth = 4;
var zoneHeight = 2.5;
var cameraWidth = 6 / 2;
var cameraHeight = 4;


function update_object(marker_id, pos, rotZ) {

  var index = markerMapping.findIndex((ele)=>(ele.marker_id == marker_id));
  if (index < 0) return;
  var obj = markerMapping[index];
  obj.last_seen_time = performance.now();
  if (loadingIndex != -1) return;
  var loadingStats = -1;
  if (obj.loaded == -1){
    obj.loaded = 0;
    loadingIndex = index;
    exports.load_asset(obj.filename, marker_id);
  }
  else if (obj.loaded == 0) {
    return;
  }
  else {
    rotZ += (obj.init_rot / 180 * Math.PI);
    var curObj = boundings.find((ele) => (ele.marker_id == marker_id));
    var vec3 = [(pos[0] / 320 - 1) * cameraWidth, (pos[1] / 480.0) * cameraHeight, 0];
    if (curObj)
    {
      if (m_vec3.distance(curObj.lastPosition, vec3) < 0.01 
      && Math.abs(rotZ - curObj.lastRotation) < 0.04)
      {
        curObj.lastPosition = [vec3[0], vec3[1], 0];
        curObj.lastRotation = rotZ;
        curObj.static_count++;
        if (curObj.static_count > 20)
        {
          if (selected_id == marker_id)
          {
            m_trans.set_translation(selectionBox, vec3[0], vec3[1], 0);
            m_trans.set_rotation_euler(selectionBox, 0, 0, rotZ);
          }
          return;
        }        
      }
      else
      {
        curObj.lastPosition = [vec3[0], vec3[1], 0];
        curObj.lastRotation = rotZ;
        curObj.static_count = 0;
      }
  }
    var objs = m_scenes.get_all_objects("ALL", obj.data_id);
    pos.z = 0;
    //rotZ = - rotZ;
    var rot = [0, 0, rotZ];
    var snapRot = m_vec3.create();
    var tr = m_TSR.create();
    m_TSR.set_trans(vec3, tr);
    var q = new Float32Array(4);
    m_quat.identity(q);
    m_quat.rotateZ(q, rotZ, q);
    m_TSR.set_quat(q, tr);
    update_boundings(marker_id, tr);
    if (snapBoundings(marker_id, vec3, snapRot))
    {
        m_trans.set_translation(objs[0], vec3[0], vec3[1], 0);
        rotZ -= snapRot[2];
        m_trans.set_rotation_euler(objs[0], snapRot[0], snapRot[1], rotZ); 
        m_quat.identity(q);
        m_quat.rotateZ(q, rotZ, q);
        m_TSR.set_quat(q, tr);
        update_boundings(marker_id, tr);
    }
    else
    {
      m_trans.set_translation(objs[0], vec3[0], vec3[1], 0);
      m_trans.set_rotation_euler(objs[0], 0, 0, rotZ);  
    }

    if (selected_id == marker_id)
    {
      m_trans.set_translation(selectionBox, vec3[0], vec3[1], 0);
      m_trans.set_rotation_euler(selectionBox, 0, 0, rotZ);
    }
  }
}

function render_cb(delta, timeline)
{
  if (selected_id >= 0)
  {
    m_material.set_line_params(selectionBox, 
      {color: new Float32Array([0, 0, 1.0, 0.2 + 0.4 * (1 + Math.sin(timeline * 2))]), 
      width: 5
    });
  }
  if (m_scenes.is_visible(zoneLineObj)) {
    m_material.set_line_params(zoneLineObj,
      {
        color: new Float32Array([1.0, 0, 0, 0.2 + 0.4 * (1 + Math.sin(timeline * 2))]),
        width: 5
      });
  }
}

//
// ar-marker tracking module
//
//

function initArMarkerTracking() {

  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

  if (navigator.getUserMedia) {
    navigator.getUserMedia({
      'video': {
        deviceId: { exact: cam_deviceId },
        //mandatory: {
        // maxWidth: 1280,
        // maxHeight: 960
        //}
      },
      audio: false
    },
      function (stream) { // on success
        var video = document.getElementById('ar_canvas');
        video.srcObject = stream;
        video.onclick = function () { video.play(); };
        video.play();

        initArCamera(video, stream);
      },
      function () { // on error
        console.log('Failed to load video.')
      });
  } else {
    console.log('Failed to init WebRTC.')
  }
}

function initArCamera(video, stream) {

  var cameraParam = new ARCameraParam();
  cameraParam.src = 'assets/js/camera_para.dat';
  cameraParam.facingMode = 'facing'
  cameraParam.onload = function () {

    var arController;
    var interval = setInterval(function () {

      if (!video.videoWidth) return;

      if (!arController) {

        arController = new ARController(video, cameraParam);
        arController.setPatternDetectionMode(artoolkit.AR_MATRIX_CODE_DETECTION);
        //arController.debugSetup();

        arController.addEventListener('getMarker', function (event) {
          var foundMarkers = event.data

          //update_object(10, [0, 0, 0], 0);
          //arController.debugPositioning(document.getElementById('ArMarkerPosition'), event.data)
          foundMarkers.forEach(ele=>{
            var dest = new Float32Array(8);
            m_TSR.from_mat4(ele.matrix, dest);
            var q = new Float32Array(4);
            q = m_TSR.get_quat_view(dest);
            var eu = new Float32Array(3);
            m_util.quat_to_euler(q, eu);
            update_object(ele.marker.id, ele.marker.pos, eu[2]);
          });
        })
      }

      // ar-marker injection point
      // after detection, getMarker event will be called
      arController.process();

      var t = performance.now();
      markerMapping.forEach((ele)=>{
        if((ele.loaded == 1) && (t - ele.last_seen_time > 1000)){
          exports.unload_asset(ele.data_id, false);
        }
      });

      var all_static = true;
      boundings.forEach(bb => {
        if (bb.static_count < 20) {
          all_static = false;
          lastStaticTime = -1;
          if (m_scenes.is_visible(zoneLineObj)) {
            m_scenes.hide_object(zoneLineObj);
            exports.scene_region_update_cb(0, 0, false);
          }
        }
      });
      if (all_static) {
        if (lastStaticTime < 0) {
          lastStaticTime = t;
        }
        if (t - lastStaticTime > 2000) {
          exports.summerizeSceneBB();
        }
      }
    }, 16); // 16 => 1000 msec /16 = 62.5fps
  };
}

});

// import the app module and start the app by calling the init method
var IKEA_main = b4w.require("IKEA_Lego_b4w_main");
