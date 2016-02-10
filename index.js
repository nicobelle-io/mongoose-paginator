'use strict';

/**
 * Methods.
 */

// @private
function buildOptions(options, callback) {
  options = options || {};
    
  var convertSorters = function(sorters, callback) {
    if(sorters && typeof sorters === 'string') { // Sencha ExtJS, my case
      var jsonSorters = JSON.parse(sorters);
      var result = {};
      var sort;
    
      for(var i = 0, len = jsonSorters.length; i < len; i++) {
        sort = jsonSorters[i];
        
        if(sort.direction !== 1 && sort.direction !== -1) {
          sort.direction = sort.direction === 'DESC' || sort.direction === 'desc' ? -1 : 1;
        }
            
        result[sort.property] = sort.direction;
      }
    
      return callback(false, result);
    }
    
    return callback(false, sorters);
  };
    
  var convertCriteria = function(criteria, schema, callback) {
    if(criteria && typeof criteria === 'string') { // Sencha ExtJS, my case
      var jsonCriteria = JSON.parse(criteria);
      var result = {};
      var predicate;
      var schemaPath;
      var existing;
      
      for(var i = 0, len = jsonCriteria.length; i < len; i++) {
        predicate = jsonCriteria[i];
        
        // ignore not paths mongoose
        schemaPath = schema.path(predicate.property);
        if(!schemaPath) {
          continue;
        }
        
        // operator: 'like', '=', 'eq', 'gt', 'gte', 'lt', 'lte', 'in'
        if('like' === predicate.operator) {
          result[predicate.property] = new RegExp(predicate.value, 'i');
        
        } else if('lt' === predicate.operator) {
          existing = result[predicate.property];
          result[predicate.property] = existing && existing.$gt ? { $lt: predicate.value, $gt: existing.$gt } : { $lt: predicate.value };
        
        } else if('gt' === predicate.operator) {
          existing = result[predicate.property];
          result[predicate.property] = existing && existing.$lt ? { $gt: predicate.value, $lt: existing.$lt } : { $gt: predicate.value };
        
        } else if('lte' === predicate.operator) {
          existing = result[predicate.property];
          result[predicate.property] = existing && existing.$gte ? { $lte: predicate.value, $gte: existing.$gte } : { $lte: predicate.value };
        
        } else if('gte' === predicate.operator) {
          existing = result[predicate.property];
          result[predicate.property] = existing && existing.$lte ? { $gte: predicate.value, $lte: existing.$lte } : { $gte: predicate.value };
        
        } else if('in' === predicate.operator) {
          result[predicate.property] = { $in: predicate.value };
        
        } else {
          result[predicate.property] = predicate.value;
        }
      }
    
      return callback(false, result);
    }
      
    return callback(false, criteria);
  };
    
  var opts = {
    maxLimit: options.maxLimit || 25,
    limit: options.limit || 0,
    page: options.page || 1,
    lean: options.lean === undefined ? true : options.lean, // Plain object, more peformance
    select: options.select || '',
    populate: options.populate || '',
    convertCriteria: options.convertCriteria || convertCriteria, 
    criteriaWrapper: options.criteriaWrapper,
    sorters: options.sorters || [],
    convertSorters: options.convertSorters || convertSorters 
  };
    
  if(typeof opts.convertSorters !== 'function') {
    return callback(new Error('Option converterSorters is not a function.'));
  }
    
  if(typeof opts.convertCriteria !== 'function') {
    return callback(new Error('Option convertCriteria is not a function.'));
  }
  
  return callback(false, opts);
}

// @private
function buildSelect(select, callback) {
  if(select && typeof select === 'function') {
    return select(callback);
  }
  
  return callback(false, select); // String/Object
}

// @private
function buildPopulate(populate, callback) {
  if(populate && typeof populate === 'function') {
    return populate(callback);
  }
  
  return callback(false, populate);  // String/Object
}

// @private 
function buildLimit(limit, maxLimit, callback) {
  if(limit && typeof limit === 'function') {
    return limit(maxLimit, callback);
  }
  
  var newLimit = typeof limit !== 'undefined' && limit < maxLimit ? limit : maxLimit;
  return callback(false, newLimit); // Number
}

// @private
function buildStart(page, limit, callback) {
  if(page && typeof page === 'function') {
    return page(limit, callback);
  }
  
  var start = (page - 1) * limit;
  return callback(false, start); // Number
}

// @private
function buildSorters(sorters, convertSorters, callback) {
  convertSorters(sorters, function(err, convertedSorters) {
    if(err) {
      return callback(err);
    }
    
    if(convertedSorters && typeof convertedSorters === 'object') {
      return callback(false, convertedSorters);
  
    } else if(convertedSorters && typeof convertedSorters === 'function') {
      return convertedSorters(callback);
    }
    
    return callback(new Error('Type of sorters not supported.'));
  });
}

// @private
function buildCriteria(criteria, convertCriteria, schema, callback) {
  convertCriteria(criteria, schema, function(err, convertedCriteria) {
    if(err) {
      return callback(err);
    }
    
    if(convertedCriteria && typeof convertedCriteria === 'object') {
      return callback(false, convertedCriteria);
  
    } else if(convertedCriteria && typeof convertedCriteria === 'function') {
      return convertedCriteria(callback);
    }
    
    return callback(new Error('Type of criteria not supported.'));    
  });
}

// @private
function buildCriteriaWrapper(criteriaWrapper, criteria, callback) {
  if(criteriaWrapper && typeof criteriaWrapper === 'function') {
    return criteriaWrapper(criteria, callback);
  }
  
  return callback(false, criteria); // Object
}

// @private
function buildFind(model, select, populate, criteria, page, limit, start, sorters, lean, callback) {
  model
  .find(criteria)
  .select(select)
  .populate(populate)
  .lean(lean)
  .sort(sorters)
  .skip(start)
  .limit(limit)
  .exec(function (err, docs) {
    if (err) {
      return callback(err);
    }
    
    if(!docs) {
      return callback(false, { total: 0, limit: limit, page: page, data: {} });
    }
    
    model.where(criteria).count().exec(function (err, count) {
      if (err) {
        return callback(err);
      }
      
      callback(false, { total: count, limit: limit, page: page, data: docs });
    });
  });
}

module.exports = function(schema, defaultOptions) {
  schema.static('paginate', function(criteria, options, callback) {
    var model = this;

    // Callback hell
    // NOTE: 
    // - First version as simple as possible and compatible with all NodeJS versions!
    // - Check modules async.js e bluebird.js
    // - Check syntax ECMAScript 6
    return buildOptions(options, function(err, opts) {
      if(err) {
        return callback(err);
      }
        
      buildSelect(opts.select, function(err, select) {
        if(err) {
          return callback(err);
        }
            
        buildPopulate(opts.populate, function(err, populate) {
          if(err) {
            return callback(err);
          }
        
          buildLimit(opts.limit, opts.maxLimit, function(err, limit) {
            if(err) {
              return callback(err);
            }
  
            buildStart(opts.page, limit, function(err, start) {
              if(err) {
                return callback(err);
              }
              
              buildSorters(opts.sorters, opts.convertSorters, function(err, sorters) {
                if(err) {
                  return callback(err);
                }
  
                buildCriteria(criteria, opts.convertCriteria, model.schema, function(err, criteria) {
                  if(err) {
                    return callback(err);
                  }
                  
                  buildCriteriaWrapper(opts.criteriaWrapper, criteria, function(err, wrappedCriteria) {
                    if(err) {
                      return callback(err);
                    }
                    
                    buildFind(model, select, populate, wrappedCriteria, opts.page, limit, start, sorters, opts.lean, callback);
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};