'use strict';

module.exports = function(schema, schemaOptions) {
  
  schema.static('paginate', function(criteria, options, callback) {
  	var self = this;
  	var callback = options && typeof options === 'function' ? options : callback;
  	
  	var o = buildOptions(options, schemaOptions);
  	o.sort = o.convertSort(o.sort, schema);
  	criteria = o.criteriaWrapper(o.convertCriteria(criteria, schema));
  	
  	var promise = new Promise(function(resolve, reject) {
  	  let resultFn = (err, count, docs) => {
  	    let result = { total: count, limit: o.limit || count, page: o.page, data: docs };
    	  
    	  if(err) {
    	    callback && callback(err);
    	    return reject(err);
    	  }
    	  
    	  callback && callback(null, result);
    	  return resolve(result);
  	  };

  	  self.where(criteria).count().exec().then(function(count) {
    	  if(count <= 0) { return resultFn(null, count, {}); }
    	  
    	  let query = self.find(criteria).select(o.select).populate(o.populate).lean(o.lean).skip(o.skip);
      	if(o.sort) { query.sort(o.sort); }
      	if(o.limit && o.limit > 0) { query.limit(o.limit); }
      	
      	query.exec().then(function(docs) {
      	  return resultFn(null, count, docs);
        });
  	  }, function(err) { resultFn(err); });
  	});

  	return promise;
  });
};

function buildOptions(options, schemaOptions) {
	var o = Object.assign({}, options || {}, schemaOptions || {});

	// Basic options
	o.limit = o.limit && typeof o.limit === 'function' ? o.limit(o.maxLimit) : ((o.limit && o.maxLimit && o.limit > o.maxLimit) || !o.limit ? o.maxLimit : o.limit);
	o.page = o.page || 1;
	o.skip = (o.page - 1) * (o.limit || 0);
	o.lean = o.lean !== undefined ? o.lean : true; // Plain object, more peformance
	o.select = o.select && typeof o.select === 'function' ? o.select() : o.select;
	o.populate = o.populate && typeof o.populate === 'function' ? o.populate() : (o.populate || '');
	
	// Advanced options
	var convert = (converter) => { return converter && typeof converter === 'function' ? converter : function (value, schema) { return value; }; };
	o.convertSort = convert(o.convertSort);
	o.convertCriteria = convert(o.convertCriteria);
	o.criteriaWrapper = o.criteriaWrapper && typeof o.criteriaWrapper === 'function' ? o.criteriaWrapper : function (criteria) { return criteria; };
	
	return o;
}