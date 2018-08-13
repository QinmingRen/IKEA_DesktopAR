
var path = require("path");
var fs = require('fs');
var bodyParser = require('body-parser');
var express = require("express");
var xlsx = require('xlsx');
var multiparty = require('multiparty');
var http = require("http");
var https = require("https");
var app = express();
//var cors = require('cors');


function deepCopy(source) { 
    var result={};
    for (var key in source) {
        result[key] = typeof source[key]==='object' ? deepCopy(source[key]): source[key];
    } 
    return result; 
}

//app.use(cors()); 

//app.use(bodyParser({uploadDir:'./addtional'}));
app.use(bodyParser.json());
app.use(express.static('../dist'));

app.get("/", (req, res)=>{
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

var modeldata;
fs.readFile("modeldata.json", "utf8", (err, data)=>{
    modeldata = data;
});

var dummydata;
fs.readFile("dummy.json", (err, data)=>{
    dummydata = JSON.parse(data);
});

app.get("/models", (req, res)=>{
    res.send(modeldata);
})

 app.get("/itemdata", (req, res)=>{
    var params = req.query;

    var cached = itemDataCache.find((ele)=>(ele.RetailItemComm.ItemNo.$==params.id));
    if (cached){
         res.send(cached);
    }
    else
    {
        console.log(params.id + " didn't find in local cache. Fetching from remote...")
        var options={
            hostname: "iows.ikea.cn",
            path:"/retail/iows/cn/en/catalog/items/art," + params.id,
            headers: {
                'Consumer':'IRAA',
                'Contract':'28792',
                'Accept':'application/vnd.ikea.iows+json; version=2.0'}
            };
        var body = '';
        try{
            http.get(options, (inner_res)=>{
                inner_res.on('data', (data)=>{
                    body += data;
                });
                inner_res.on('end', ()=>{
                    try{
                        var obj = JSON.parse(body);
                        itemDataCache.push(obj);
                        res.json(200);
                    }
                    catch (e) {
                      if (additionalItemData == null) {
                        res.send(JSON.stringify(dummydata));
                      }
                      var additional = additionalItemData.find((ele)=>(ele.RetailItemComm.ItemNo.$==params.id));
                      if (additional != null)
                      {
                          res.send(additional);
                      }
                      else
                      {
                          res.send(JSON.stringify(dummydata));
                      }
                    }
                });
            })
        }
        catch(e){
            console.log(e);
        }
    }
 });

function parseTable(xlsName){
    const workbook = xlsx.readFile(xlsName);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    var ref = worksheet['!ref'];
    var reg = /[a-zA-Z]/g;
    rows = ref.replace(reg, "");
    var colCount = 61;
    
    function getColName(index) {
      var col = index % 26;
      var col2 = Math.floor(index / 26) - 1;
      var colName = String.fromCharCode(col + 65);
      if (col2 >= 0) {
        colName = String.fromCharCode(col2 + 65) + colName;
      }
      return colName;
    }
    
    var line = parseInt(rows.split(':')[1]);
    var database = {memodels: {},
                    groups: {}};
    
    var memodels = database.memodels;
    var groups = database.groups;
    var curModel;
    for (var i = 2; i <= line; ++i) {
      var code = worksheet['B' + i];
      var cname = worksheet['C' + i];
      var marker_id = worksheet['D' + i];
      var rotation = worksheet['E' + i];
      if (code != null && marker_id != null)
      {
          curModel = memodels[code.v];
          if (curModel == null)
          {
              curModel = {
                  'mecode': code.v,
                  'cname': cname.v,
                  'marker_id': marker_id.v,
                  'rotation': rotation.v,
                  'components': new Object};
              memodels[code.v] = curModel;
          }
          curModel.components = {};
          if (groups[marker_id.v] == null)
              groups[marker_id.v] = [code.v];
          else
              groups[marker_id.v].push(code.v);
      }
    
      for (var j = 5; j < 61; j += 4) {
        var serial = worksheet[getColName(j) + '1'];
        var itemNo = worksheet[getColName(j) + i];
        var itemName = worksheet[getColName(j + 1) + i];
        var itemPrice = worksheet[getColName(j + 2) + i];
        var itemQuantity = worksheet[getColName(j + 3) + i];
        if (itemNo == null) continue;
        if (curModel != null)
        {
            var comps = curModel['components'];
            var curSer = comps[serial.v];
            var newdata = {'articalNo': itemNo.v, 'name' : itemName.v, 'price_local': itemPrice.v, 'quantity': itemQuantity.v};
            if (curSer == null)
            {
                comps[serial.v] = [newdata];
            }
            else
            {
                curSer.push(newdata);
            }
        }
      }
    }
    fs.writeFile("database.json", JSON.stringify(database), (err)=>{
        if (err) 
            console.log(err);
        else
            console.log('parse succeeded');
    });
}

function initDatabase()
{
  fs.readFile("database.json", (err, data) => {
    if (!err) database = JSON.parse(data);
    });
}

initDatabase();

app.post('/uploadFile', (req, res) => {
  console.log("got a file, try parsing...");
    var form = new multiparty.Form({uploadDir: './'});
    form.parse(req, function(err, fields, files) {
      var filesTmp = JSON.stringify(files,null,2);
  
      if(err){          
        res.json(201);
      } else {
        var inputFile = files.file[0];
        var uploadedPath = inputFile.path;
        var dstPath = './' + inputFile.originalFilename;
        fs.rename(uploadedPath, dstPath, function(err) {
          if(err){
            res.json(201);
          } else {
              parseTable(dstPath);
              initDatabase();
              res.json(200);
          }
        });
      } 
    });
});

app.get("/me_data", (req, res) => {
  res.send(database.memodels);
})

app.get("/group_data", (req, res) => {
  res.send(database.groups);
})

 
var server = app.listen(8080, ()=>{
    var host = server.address().address;
    var port = server.address().port;

    console.log("server address is: %s:%s", host, port);
});

//var httpsOption = {
//  key: fs.readFileSync('/root/ssl/ssl.key'),
//  cert: fs.readFileSync('/root/ssl/ssl.crt')
//};

//http.createServer(app).listen(8080);
//https.createServer(httpsOption, app).listen(8081);
//console.log("server address is: 8080");
//console.log("server address is: 8081");

