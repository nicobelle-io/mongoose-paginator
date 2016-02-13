'use strict';

/**
 * Methods.
 */

function buildOptions(methodOptions, schemaOptions, callback) {
  methodOptions = methodOptions || {};
  schemaOptions = schemaOptions || {};
  
  var options = {
    maxLimit: methodOptions.maxLimit || schemaOptions.maxLimit,
    limit: methodOptions.limit || schemaOptions.limit,
    page: methodOptions.page || schemaOptions.page || 1,
    lean: methodOptions.lean !== undefined ? methodOptions.lean : schemaOptions.lean === undefined, // Plain object, more peformance
    select: methodOptions.select || schemaOptions.select || '',
    populate: methodOptions.populate || schemaOptions.populate,
    convertCriteria: methodOptions.convertCriteria || schemaOptions.convertCriteria || function convertCriteria(criteria, schema, callback) {
      return callback(false, criteria);
    }, 
    criteriaWrapper: methodOptions.criteriaWrapper || schemaOptions.criteriaWrapper,
    sort: methodOptions.sort || schemaOptions.sort,
    convertSort: methodOptions.convertSort || schemaOptions.convertSort || function convertSort(sort, schema, callback) {
      return callback(false, sort);
    } 
  };
  
  if(typeof options.convertSort !== 'function') {
    return callback(new TypeError('ConvertSort is not a function.'));
  }
    
  if(typeof options.convertCriteria !== 'function') {
    return callback(new TypeError('ConvertCriteria is not a function.'));
  }
  
  return callback(false, options);
}

function buildSelect(select, callback) {
  return build(select, callback);
}

function buildPopulate(populate, callback) {
  return build(populate, callback);
}

function build(value, callback) {
  if(value && typeof value === 'function') {
    return value(callback);
  }
  
  return callback(false, value);
}

function buildLimit(limit, maxLimit, callback) {
  if(limit && typeof limit === 'function') {
    return limit(maxLimit, callback);
  }
  
  if((limit && maxLimit && limit > maxLimit) || !limit) {
    return callback(false, maxLimit);
  }
  
  return callback(false, limit);
}

function buildSkip(page, limit, callback) {
  if(page && typeof page === 'function') {
    return page(limit, callback);
  }
  
  var skip = (page - 1) * limit;
  return callback(false, skip);
}

function buildSort(sort, convertSort, schema, callback) {
  return convert(convertSort, sort, schema, callback);
}

function buildCriteria(criteria, convertCriteria, schema, callback) {
  return convert(convertCriteria, criteria, schema, callback);
}

function convert(converter, value, schema, callback) {
  return converter(value, schema, function(err, convertedValue) {
    if(err) {
      return callback(err);
    }
    
    if(convertedValue && typeof convertedValue === 'object') {
      return callback(false, convertedValue);
    
    } else if(convertedValue && typeof convertedValue === 'function') {
      return convertedValue(callback);
    }
    
    return callback(false, convertedValue);  
  });
}

function buildCriteriaWrapper(criteriaWrapper, criteria, callback) {
  if(criteriaWrapper && typeof criteriaWrapper === 'function') {
    return criteriaWrapper(criteria, callback);
  }
  
  return callback(false, criteria);
}

function buildFind(model, select, populate, criteria, page, limit, skip, sort, lean, callback) {
  var query = model
  .find(criteria)
  .select(select)
  .populate(populate || '')
  .lean(lean)
  .skip(skip);
  
  if(sort) {
    query.sort(sort);
  }
  
  if(limit && limit > 0) {
    query.limit(limit);
  }
  
  query.exec(function (err, docs) {
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
      
      if(!limit || limit <= 0) {
        limit = count;
      }
      
      callback(false, { total: count, limit: limit, page: page, data: docs });
    });
  });
}

module.exports = function(schema, schemaOptions) {
  schema.static('paginate', function(criteria, options, callback) {
    var model = this;
    
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
  
    // Callback hell
    // NOTE: 
    // - First version as simple as possible and compatible with all NodeJS versions!
    // - Check modules async.js e bluebird.js
    // - Check ECMAScript 6
    buildOptions(options, schemaOptions, function(err, opts) {
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
  
            buildSkip(opts.page, limit, function(err, skip) {
              if(err) {
                return callback(err);
              }
              
              buildSort(opts.sort, opts.convertSort, model.schema, function(err, sort) {
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
                    
                    buildFind(model, select, populate, wrappedCriteria, opts.page, limit, skip, sort, opts.lean, callback);
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