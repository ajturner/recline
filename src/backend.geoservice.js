this.recline = this.recline || {};
this.recline.Backend = this.recline.Backend || {};
this.recline.Backend.GeoService = this.recline.Backend.GeoService || {};

(function(my) {
  my.__type__ = 'geoservice';

  // use either jQuery or Underscore Deferred depending on what is available
  var Deferred = _.isUndefined(this.jQuery) ? _.Deferred : jQuery.Deferred;

  // ## GeoService backend
  // 
  // Fetch data from an OGC GeoService.
  //
  // Dataset must have a url attribute pointing to the Gdocs or its JSON feed e.g.
  // <pre>
  // var dataset = new recline.Model.Dataset({
  //     url: 'http://services.arcgis.com/bkrWlSKcjUDFDtgw/arcgis/rest/services/596_Acres_Lots/FeatureServer'
  //   },
  //   'geoservice'
  // );
  // </pre>
  //
  // @return object with two attributes
  //
  // * fields: array of Field objects
  // * records: array of objects for each row
  my.fetch = function(dataset) {
    var dfd  = new Deferred(); 
    var urls = my.getGeoserviceAPIUrls(dataset.url);


    // TODO cover it with tests
    // get the spreadsheet title
    (function () {
      var titleDfd = new Deferred();

      jQuery.getJSON(urls.service, function (d) {
          titleDfd.resolve({
              spreadsheetTitle: d.name.$t
          });
      });

      return titleDfd.promise();
    }()).then(function (response) {

      // get the actual worksheet data
      jQuery.getJSON(urls.query, function(d) {
        var result = my.parseData(d);
        // var fields = _.map(result.fields, function(fieldId) {
        //   return {id: fieldId};
        // });

        dfd.resolve({
          metadata: {
              title: response.name,
              spreadsheetTitle: response.name,
              worksheetTitle  : result.worksheetTitle
          },
          records       : result.records,
          fields        : result.fields,
          useMemoryStore: true
        });
      });
    });

    return dfd.promise();
  };

  // ## parseData
  //
  // Parse data from Google Docs API into a reasonable form
  //
  // :options: (optional) optional argument dictionary:
  // columnsToUse: list of columns to use (specified by field names)
  // colTypes: dictionary (with column names as keys) specifying types (e.g. range, percent for use in conversion).
  // :return: tabular data object (hash with keys: field and data).
  // 
  // Issues: seems google docs return columns in rows in random order and not even sure whether consistent across rows.
  my.parseData = function(featureService, options) {
    var options  = options || {};
    var colTypes = options.colTypes || {};
    var results = {
      fields : [],
      records: []
    };
    var entries = featureService.features || [];
    var key;
    var colName;
    
    for(key in featureService.fields) {
      results.fields.push(featureService.fields[key].name);
    }
    results.fields.push("geometry");
    results.records = _.map(entries, function(entry) {
      entry.attributes['geometry'] = {type: "Point", coordinates: [entry.geometry.x, entry.geometry.y]};
      return entry.attributes;
    });
    
    results.worksheetTitle = "featureService.name.$t";
    return results;
  };

  // Convenience function to get GeoService JSON API Url from standard URL
  my.getGeoserviceAPIUrls = function(url) {
    // http://services.arcgis.com/bkrWlSKcjUDFDtgw/arcgis/rest/services/596_Acres_Lots/FeatureServer/0?f=pjson
    var urls = {
      query: url + "/0/query?where=1%3D1&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&outSR=4326&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&f=pjson&token=",
      service: url + "/0?f=json"
    };    

    return urls;
  };
}(this.recline.Backend.GeoService));
