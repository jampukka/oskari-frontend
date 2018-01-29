/**
 * @class Oskari.framework.bundle.hierarchical-layerlist.view.SelectedLayersTab
 *
 *
 */
Oskari.clazz.define(
    'Oskari.framework.bundle.hierarchical-layerlist.view.SelectedLayersTab',

    /**
     * @method create called automatically on construction
     * @static
     */

    function(instance) {
        this.instance = instance;
        this.locale = this.instance.getLocalization('SelectedLayersTab');
        this.sb = this.instance.getSandbox();
        this.id = 'hierarchical-layerlist-selected-layers-tab';

        this._notifierService = this.sb.getService('Oskari.framework.bundle.hierarchical-layerlist.OskariEventNotifierService');

        this._templates = {
            layerlist: jQuery('<ul class="layerlist sortable" ' + 'data-sortable=\'{' + 'itemCss: "li.layer.selected", ' + 'handleCss: "div.layer-title" ' + '}\'></ul>')
        };


        this._layers = {};

        this._createUI();
        this._bindOskariEvents();
    }, {
        /**
         * @method @public getTabPanel Gets tab panel
         * @return {Oskari.userinterface.component.TabPanel} selected layer tab panel
         */
        getTabPanel: function() {
            return this.tabPanel;
        },
        updateSelectedLayers: function() {
            var me = this;
            me._setSelectedLayers();
            me._updateLayerCount();
        },
        /**
         * @return {[type]}
         */
        _updateLayerCount: function() {
            var me = this;
            var selectedLayers = me.sb.findAllSelectedMapLayers();
            var icon = me.tabPanel.getHeader().find('.layers-selected');
            icon.html('<div class="layer-count">' + selectedLayers.length + '</div>');
            icon.stop();
            me._blink(icon, 2);
        },

        /**
         * Create UI
         * @method  @private _createUI
         *
         * @param  {String} oskarifieldId oskari field id
         */
        _createUI: function(oskarifieldId) {
            var me = this;

            me.tabPanel = Oskari.clazz.create('Oskari.userinterface.component.TabPanel');
            me.tabPanel.setTitle(me.locale.title, me.id);
            me.tabPanel.setTitleIcon('layers-selected icon-bubble-right');

            var layerContainer = me._templates.layerlist.clone();

            layerContainer.sortable({
                start: function(event, ui) {
                    var height = ui.item.height();
                    me._calculateContainerHeightDuringSort(height);
                },
                stop: function(event, ui) {
                    me._calculateContainerHeightDuringSort();
                    me._layerOrderChanged(ui.item);
                }
            });

            me.tabPanel.setContent(layerContainer);


            me._updateContainerHeight(jQuery('#mapdiv').height());
        },

        _setSelectedLayers: function() {
            var me = this;
            var selectedLayers = me.sb.findAllSelectedMapLayers();

            selectedLayers.reverse().forEach(function(layer) {
                me._addLayer(layer, false, true);
            });

        },

        _calculateContainerHeightDuringSort: function(height) {
            var me = this;
            var container = me.tabPanel.getContainer();
            if (typeof height === "undefined") {
                container.css({
                    height: ""
                });
            }
            var totalHeight = container.height() + height;
            container.css({
                height: totalHeight
            });
        },

        _addLayer: function(layer, keepLayersOrder, forceAdd) {
            var me = this;
            if (me._layers[layer.getId()]) {
                return;
            }
            var list = me.tabPanel.getContainer().find('.layerlist');
            var layerComponent = Oskari.clazz.create('Oskari.framework.bundle.hierarchical-layerlist.SelectedLayer', layer, me.sb, me.locale);
            var previousLayers = list.find('li.layer');
            if (layer.isBaseLayer() && !keepLayersOrder && !forceAdd) {
                previousLayers = list.find('li.layer[data-layerid^=base_]');
            }
            if (forceAdd) {
                list.append(layerComponent.getElement());
            } else if (previousLayers.length > 0 && layer.isBaseLayer() && !keepLayersOrder) {
                previousLayers.last().after(layerComponent.getElement());
            } else if (previousLayers.length > 0) {
                previousLayers.first().before(layerComponent.getElement());
            } else {
                list.append(layerComponent.getElement());
            }
            me._layers[layer.getId()] = layerComponent;
        },

        /**
         * @private @method _layerOrderChanged
         * Notify Oskari that layer order should be changed
         *
         * @param {Number} newIndex index where the moved layer is now
         *
         */
        _layerOrderChanged: function(item) {
            var me = this;
            var allNodes = me.tabPanel.getContainer().find('.layerlist li.layer'),
                movedId = item.attr('data-layerid'),
                movedIndex = me.tabPanel.getContainer().find('.layer[data-layerid=' + movedId + ']').index();


            if (movedIndex > -1) {
                // the layer order is reversed in presentation
                // the lowest layer has the highest index
                movedIndex = (allNodes.length - 1) - movedIndex;
                var sandbox = me.instance.getSandbox();

                var requestBuilder = Oskari.requestBuilder('RearrangeSelectedMapLayerRequest');
                var request = requestBuilder(movedId, movedIndex);
                sandbox.request(me.instance.getName(), request);
            }
        },
        /**
         * @private @method _handleLayerOrderChanged
         *
         * @param {AfterRearrangeSelectedMapLayerEvent} event
         *
         */
        _handleLayerOrderChanged: function(event) {
            var me = this;
            var layer = event.getMovedMapLayer();
            var fromPosition = event.getFromPosition();
            var toPosition = event.getToPosition();
            // Safety check
            if (!layer && isNaN(fromPosition) && isNaN(toPosition)) {
                return;
            }

            if (fromPosition === toPosition) {
                // Layer wasn't actually moved, ignore
                return;
            }

            // Layer order is inverted in the DOM.
            // Also note that from- and toPosition are 0-based, where nth-child
            // based, so we just subtract position from layer count
            var layerContainer = me.tabPanel.getContainer().find('ul.layerlist'),
                layerCount = layerContainer.find('> li').length,
                fromIndex = layerCount - fromPosition, // Order is inverted
                toIndex = layerCount - toPosition,
                el = layerContainer.find('> li:nth-child(' + fromIndex + ')').detach();

            if (toIndex === 1) {
                // First element, just add to the beginning
                layerContainer.prepend(el);
            } else if (toIndex === layerCount) {
                // Last element, just add to the end
                layerContainer.append(el);
            } else {
                // Somewhere in the middle, add before index
                // This would fail on toIndex === layerCount as we've removed one element,
                // but that case is handled above
                layerContainer.find('> li:nth-child(' + toIndex + ')').before(el);
            }
        },

        _updateContainerHeight: function(height) {
            var me = this;
            jQuery(me.tabPanel.getContainer()).css('max-height', (height * 0.7) + 'px');
        },

        _bindOskariEvents: function() {
            var me = this;
            me._notifierService.on('AfterMapLayerAddEvent', function(evt) {
                var layer = evt.getMapLayer();
                me._addLayer(layer, evt.getKeepLayersOrder());
                me._updateLayerCount();
            });

            me._notifierService.on('AfterMapLayerRemoveEvent', function(evt) {
                var layer = evt.getMapLayer();
                me._layers[layer.getId()].getElement().remove();
                delete me._layers[layer.getId()];

                me._updateLayerCount();
            });

            me._notifierService.on('MapLayerVisibilityChangedEvent', function(evt) {
                var layer = evt.getMapLayer();
                me._layers[layer.getId()].setLayer(layer);
            });

            me._notifierService.on('AfterRearrangeSelectedMapLayerEvent', function(evt) {
                me._handleLayerOrderChanged(evt);
            });

            me._notifierService.on('AfterChangeMapLayerOpacityEvent', function(evt) {
                var layer = evt.getMapLayer();
                me._layers[layer.getId()].setLayer(layer);
            });

            me._notifierService.on('MapSizeChangedEvent', function(evt) {
                me._updateContainerHeight(evt.getHeight());
            });


        },
        _blink: function(element, count) {
            var me = this;
            if (!element) {
                return;
            }
            if (!count) {
                count = 1;
            }
            // animate to low opacity
            element.animate({
                opacity: 0.25
            }, 500, function() {
                // on complete, animate back to fully visible
                element.animate({
                    opacity: 1
                }, 500, function() {
                    // on complete, check and adjust the count parameter
                    // recurse if count has not been reached yet
                    if (count > 1) {
                        me._blink(element, --count);
                    }
                });
            });
        }
    }
);