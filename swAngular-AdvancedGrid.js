var scripts = document.getElementsByTagName("script");
var pathMap = pathMap || {};
pathMap['swAngular-AdvancedGrid'] = scripts[scripts.length - 1].src;

angular.module('swAngularAdvancedGrid', [])
    .directive('swAngularAdvancedGrid', function () {
        return {
            restrict: "A",
            replace: true,
            transclude: false,
            scope: {
                ngModel: '=',
                metaData: '=?swMetaData',
                options: '=swOptions'
            },
            templateUrl: pathMap['swAngular-AdvancedGrid'].substring(0, pathMap['swAngular-AdvancedGrid'].lastIndexOf('/') + 1) + "swAngular-AdvancedGrid.html",
            link: function ($scope) {
                if (!$scope.hasOwnProperty('options')) {
                    throw new Error('Options are required!');
                }

                /**
                 * Prepare fields
                 */
                for (var fieldKey in $scope.options.fields) {
                    $scope.options.fields.sorting = '';

                    if (typeof $scope.options.fields[fieldKey].renderer !== 'function') {
                        $scope.options.fields[fieldKey].orderByValue = $scope.options.fields[fieldKey].column;
                        $scope.options.fields[fieldKey].renderer = function (input, row, column) {
                            return input;
                        }
                    }
                }

                /**
                 * Enable eiew-elements
                 */
                $scope.showHeadingBar = $scope.options.heading || $scope.showMetaData || $scope.showRefreshButton;
                $scope.showFooterBar = $scope.options.showPagination || $scope.options.showItemsPerPage || $scope.options.showSearch;

                /**
                 * Calculate pagination
                 */
                $scope.currentPage = undefined;

                $scope.$watch('ngModel', function () {
                    /**
                     * Extract list
                     */
                    if ($scope.ngModel.hasOwnProperty('data')) {
                        $scope.list = $scope.ngModel.data;
                    } else {
                        $scope.list = $scope.ngModel;
                    }

                    /**
                     * Extract meta data
                     */
                    if ($scope.ngModel.hasOwnProperty('metaData')) {
                        $scope.metaData = $scope.ngModel.metaData;
                    }

                    if ($scope.list === undefined) {
                        throw new Error('No data provided');
                    }

                    if ($scope.metaData === undefined) {
                        throw new Error('No meta data provided');
                    }

                    $scope.itemPerPageNumber = $scope.metaData.limit || 0;
                });

                $scope.$watch('metaData', function (newMetaData) {
                    if (newMetaData === undefined) {
                        throw new Error('Meta data undefined');
                    }

                    if (newMetaData.limit === undefined) {
                        throw new Error('Meta data invalid: limit undefined');
                    }

                    if (newMetaData.offset === undefined) {
                        throw new Error('Meta data invalid: offset undefined');
                    }

                    if (newMetaData.total === undefined) {
                        throw new Error('Meta data invalid: total undefined');
                    }

                    var paginationWidth = $scope.options.paginationWidth || 2;
                    var limit = newMetaData.limit;
                    var offset = newMetaData.offset;
                    var total = newMetaData.total;

                    $scope.pages = [];
                    if (!(isNaN(limit) || isNaN(offset) || isNaN(total))) {
                        var numPages = Math.ceil(total / limit);
                        var startPage = Math.floor(offset / limit) - Math.floor(paginationWidth / 2);
                        startPage = (startPage < 0) ? 0 : startPage;

                        var currentPageId = Math.floor(offset / limit);
                        for (var i = startPage; i < Math.min(numPages, startPage + paginationWidth); i++) {
                            var newPage = {
                                label: i + 1,
                                offset: i * limit
                            };
                            if (i === currentPageId) {
                                $scope.currentPage = newPage;
                            }

                            $scope.pages.push(newPage);
                        }
                    }
                }, true);
            },
            controller: function ($scope) {
                $scope.handleButtonClick = function (callback, entry) {
                    if (typeof callback === 'function') {
                        callback(entry);
                    } else {
                        switch (callback) {
                            case 'liveedit':
                                $scope.enableLiveEditing(entry);
                                break;
                        }
                    }
                };

                $scope.storeLiveEdit = function (entry) {
                    angular.forEach($scope.list, function (entry) {
                        entry.liveEditingEnabled = false;
                    });

                    if ($scope.options.listeners && $scope.options.listeners.onliveedit) {
                        $scope.options.listeners.onliveedit(entry);
                    }
                };

                $scope.discardLiveEdit = function (entry) {
                    angular.forEach($scope.list, function (entry) {
                        entry.liveEditingEnabled = false;
                    });

                    for (var key in entry) {
                        if (entry.hasOwnProperty(key) && entry.$$swag_secure.hasOwnProperty(key)) {
                            entry[key] = entry.$$swag_secure[key];
                        }
                    }
                };

                $scope.enableLiveEditing = function (selectedEntry) {
                    if (!$scope.options.enableLiveEditing) {
                        return;
                    }

                    selectedEntry.$$swag_secure = angular.copy(selectedEntry);

                    angular.forEach($scope.list, function (entry) {
                        entry.liveEditingEnabled = false;
                    });

                    selectedEntry.liveEditingEnabled = true;
                };

                $scope.guessLiveEditingType = function (value) {
                    switch (typeof value) {
                        case 'string':
                            return 'text';
                        case 'number':
                            return 'number';
                        case 'boolean':
                            return 'checkbox';
                    }
                };

                $scope.setPage = function (page) {
                    if ($scope.metaData === undefined) return;
                    if (!$scope.options.hasOwnProperty('listeners')
                        || typeof $scope.options.listeners.onchangepage !== 'function')
                        return;

                    $scope.options.listeners.onchangepage(page.offset, $scope.metaData.limit);
                };

                $scope.setFirstPage = function () {
                    if ($scope.metaData === undefined) return;
                    $scope.options.listeners.onchangepage(0, $scope.metaData.limit);
                };
                $scope.setPreviousPage = function () {
                    if ($scope.metaData === undefined) return;
                    var currentOffset = $scope.currentPage.offset;
                    $scope.options.listeners.onchangepage(currentOffset - $scope.metaData.limit, $scope.metaData.limit);

                };
                $scope.setNextPage = function () {
                    if ($scope.metaData === undefined) return;
                    var currentOffset = $scope.currentPage.offset;
                    $scope.options.listeners.onchangepage(currentOffset + $scope.metaData.limit, $scope.metaData.limit);

                };
                $scope.setLastPage = function () {
                    if ($scope.metaData === undefined) return;
                    var numPages = Math.ceil($scope.metaData.total / $scope.metaData.limit);
                    $scope.options.listeners.onchangepage(numPages * $scope.metaData.limit - $scope.metaData.limit, $scope.metaData.limit);
                };

                $scope.isOnFirstPage = function () {
                    if ($scope.metaData === undefined) return;
                    return $scope.metaData.offset == 0;
                };

                $scope.isOnLastPage = function () {
                    if ($scope.metaData === undefined) return;

                    var numPages = Math.ceil($scope.metaData.total / $scope.metaData.limit);
                    return $scope.metaData.offset == numPages * $scope.metaData.limit - $scope.metaData.limit;
                };


                /**
                 * On Refresh
                 */
                $scope.refresh = function () {
                    if (!$scope.options.hasOwnProperty('listeners')
                        || typeof $scope.options.listeners.onrefresh !== 'function')
                        return;

                    $scope.options.listeners.onrefresh();
                };


                /**
                 * On Order change
                 * @param field
                 */
                $scope.changeOrder = function (field, orderBy, orderSequence) {
                    if (!$scope.options.hasOwnProperty('listeners')
                        || typeof $scope.options.listeners.onchangeorder !== 'function') return;

                    for (var fieldKey in $scope.options.fields) {
                        if ($scope.options.fields[fieldKey] === field) continue;

                        $scope.options.fields[fieldKey].order = '';
                    }

                    field.order = orderSequence;

                    $scope.options.listeners.onchangeorder(orderBy, orderSequence);
                };

                /**
                 * On Order change
                 * @param field
                 */
                $scope.changeItemsPerPage = function (number) {
                    if (!$scope.options.hasOwnProperty('listeners')
                        || typeof $scope.options.listeners.onitemsperpagechange !== 'function') return;

                    if (isNaN(number)) {
                        return;
                    }

                    $scope.options.listeners.onitemsperpagechange(number);
                };

                /**
                 * On Order change
                 * @param field
                 */
                $scope.search = function (query) {
                    if (!$scope.options.hasOwnProperty('listeners')
                        || typeof $scope.options.listeners.onsearch !== 'function') return;

                    $scope.options.listeners.onsearch(query);
                };
            }
        };
    });