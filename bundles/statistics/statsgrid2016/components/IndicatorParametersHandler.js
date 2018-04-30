Oskari.clazz.define('Oskari.statistics.statsgrid.IndicatorParameterHandler', function (service, locale) {
    this.service = service;
    this.locale = locale;
    this._values = null;
    this.datasource = null;
    this.indicators = null;
    this.elements = null;

    Oskari.makeObservable(this);
}, {
    getData: function ( datasrc, indicators, elements ) {

        this.datasource = datasrc;
        this.indicators = indicators;
        this.elements = elements;

        if ( Array.isArray( indicators ) ) {
            this.handleMultipleIndicators(datasrc, indicators, elements);
            return;
        }
        this.handleSingleIndicator(datasrc, indicators, elements);
    },
    handleSingleIndicator: function( indId, cb) {
        var me = this;
        var errorService = me.service.getErrorService();
        var locale = this.locale;
        var panelLoc = locale.panels.newSearch;

        this.service.getIndicatorMetadata(this.datasource, indId, function (err, indicator) {
            if (me.elements.dataLabelWithTooltips) {
                me.elements.dataLabelWithTooltips.find('.tooltip').hide();
            }
            if (err) {
                // notify error!!
                errorService.show(locale.errors.title, locale.errors.indicatorMetadataError);
                return;
            }

            var combinedValues = {};

            indicator.selectors.forEach(function (selector, index) {
                selector.allowedValues.forEach(function (val) {
                    if ( !combinedValues[selector.id] ) {
                        combinedValues[selector.id] = [];
                    }

                    var name = val.name || val.id || val;
                    val.title = val.name;
                    var optName = (panelLoc.selectionValues[selector.id] && panelLoc.selectionValues[selector.id][name]) ? panelLoc.selectionValues[selector.id][name] : name;

                    var valObject = {
                        id: val.id || val,
                        title: optName
                    };
                    combinedValues[selector.id].push(valObject);
                });
            });

            if (indicator.regionsets.length === 0) {
                errorService.show(locale.errors.title, locale.errors.regionsetsIsEmpty);
            }

            var data = {
                datasrc: me.datasource,
                selectors: combinedValues,
                indicators: me.indicators,
                regionset: indicator.regionsets
            }
            if ( typeof cb === 'function') {
                cb(data);
            } else {
                me.trigger('Data.Loaded', data);
            }
        });
    },
    handleMultipleIndicators: function (datasrc, indicators, elements) {
        indicators = indicators.filter( function (n) { return n != "" } );
        var me = this;
        var panelLoc = this.locale.panels.newSearch;
        var combinedValues = {};
        var regionsets = [];
        var deferredArray = [];

        function addMissingElements(list, newValues, propertyName) {
            if(!list) {
                return [].concat(newValues);
            }
            return list.concat(newValues.filter(function (value) {
                return !list.some(function(existingItem) {
                    if(propertyName) {
                        return existingItem[propertyName] === value[propertyName];
                    }
                    return existingItem === value;
                })
            }));
        }
    
        indicators.forEach( function (indId) {
            var deferred = new jQuery.Deferred();
            me.handleSingleIndicator(indId, function (value) {
                // include missing regionsets
                regionsets = addMissingElements(regionsets, value.regionset);
                Object.keys(value.selectors).forEach( function(selectorName) {
                    combinedValues[selectorName] = addMissingElements(combinedValues[selectorName], value.selectors[selectorName], 'id');
                });
                deferred.resolve();
            });
            deferredArray.push(deferred);
        });

    jQuery.when.apply( jQuery, deferredArray ).done( function() {

        var data = {
            datasrc: me.datasource,
            indicators: me.indicators,
            selectors: combinedValues,
            regionset: regionsets
        }
        me.trigger('Data.Loaded', data);
    });
    }
});