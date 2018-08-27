////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * @author : YongSung.kim
 * @email : yongsung85.kim@lge.com
 * @create date : 2016. 12. 11.
 * @description commonly defined action of tree list related to monitoring manage page (system, alert, report)
 * @ Dependency : api.js, d3 libarary
 * @ Usage
 * 1. Need to give the Id of the tag.
 *    - {treeList area}            : The name is not given, and the default is "treeList".
 *    - {tresList area}SerachIcon  : consist of '<i></i>', it refers to search icon.
 *    - {treeList area}SearchInput : consist of '<input></input>', it refers to search input tag.
 *    - {treeList area}Refresh     : consist of '<button></button>', it refers to tree list refresh button.
 * 2. Create TreeListManager Object
 **/

var fromArray="";
var lastSelected = "";
var selectedDepth = 0;
var lastSelectedParent = "";

function setFromArray(id)
{
    fromArray = id;
}

function setDefaultSelected(id, depth)
{
    lastSelected = lastSelectedParent = id;
    selectedDepth = depth;
}

//from graph.js
function checkReadyCompareApply()
{
    // return readyCompareApply;
    return false;
}

//from treelist.js
(function (d3) {
    d3.layout.treelist = function () {
        "use strict";
        var hierarchy = d3.layout.hierarchy().sort(null).value(null),
            nodeHeight = 20,
            childIndent = 20,
            size;

        var treelist = function (d, i) {
            var nodes = hierarchy.call(this, d, i),
                root = nodes[0];

            function visit(f, t, index, parent) {
                if (t) {
                    f(t, index, parent);
                }
                var children = t.children;
                if (children && children.length) {
                    children.forEach(function (child, ci) {
                        visit(f, child, ci, t);
                    });
                }
            }

            /**
             visit all nodes in the tree and set the x, y positions
            */
            function layout(node) {
                //all children of the same parent are rendered on the same  x level
                //y increases every time a child is added to the list
                var x = 0, y = 0;
                visit(function (n, index, parent) {
                    x = parent ? parent.x + childIndent : 0;
                    y = y + nodeHeight;
                    n.y = y;
                    n.x = x;

                }, node);
                //update size after visiting
                size = [x, y];
            }

            layout(root);
            return nodes;
        };

        treelist.size = function () {
            return size;
        };

        treelist.nodeHeight = function (d) {
            if (arguments.length) {
                nodeHeight = d;
                return treelist;
            }
            return nodeHeight;
        };

        treelist.childIndent = function (d) {
            if (arguments.length) {
                childIndent = d;
                return treelist;
            }
            return childIndent;
        };

        treelist.nodes = treelist;

        return treelist;
    };

}(d3));

var isClickFoldingBtn = false;

function TreeListManager(pSystemId, pTreeListId, pTreeItemClickEvent, pCallbackAfterMakeTreeList, pStatus) {
    var isGraphTab = ($('#tabSubmenu button.tabmenubtn.on').val() === "graph");
    // if status is null, default
    // if status is "graph", check button appeared.
    this.status = pStatus;
    this.systemId = pSystemId;
    this.treeListId = pTreeListId;
    this.treeListMobileId = undefined;
    this.treeItemClickEvent = pTreeItemClickEvent;

    this.callbackAfterMakeTreeList = pCallbackAfterMakeTreeList;

    this.basicData;
    this.currentTreeData;

    this.canvas = undefined;
    this.pTree = undefined;

    var self = this;

    run();

    function run() {
        // initilize d3
        initD3(d3);

        bindEvent();
        makeTreeList();

    }

    function test(){
      var myText = '{"result":"OK","data":{"treeList":{"system_name":"jangheeAll","event_yn":"N","gateways":[{"mis":[{"module_id":"Z00001052188","mac_address":"28D18E000089","gw_serial_no":"900JANG90930","event_yn":"N"},{"module_id":"Z00001052189","mac_address":"28D18E000090","gw_serial_no":"900JANG90930","event_yn":"N"}],"gw_serial_no":"900JANG90930","event_yn":"N"}],"esslist":[{"ess_id":"ESS123456","ess_serial_no":"900JANG90901","event_yn":"N","pv":"PV","battery":"BATTERY","grid":"GRID"}]}}}';
      var myJson = $.parseJSON( myText );
      return myJson;
    }

    function makeTreeList(param) {
      var obj = test();
      (function( obj ) {
                if (obj.result == "OK") {
                    $("#" + self.treeListId + "SearchInput").val("");
                    $("#" + self.treeListId + "SearchIcon").removeClass("delete");
                    $("#tree-search").val("");
                    $("#pc-tree-search").val("");
                    $("#mtree-search").val("");
                    $(".icon-search").removeClass('delete');

                    /* 2018.01.19 bh.ryu
                     * when click refresh button on compare mode
                     * remove dim of apply button and clear moduleIdList
                     */
                    if (self.status === "compareGraph") {
                        clearModuleIdList();
                    }

                    self.basicData = loadTreeIDList(obj.data.treeList);
                    self.currentTreeData = $.extend(true, {}, self.basicData);
                    self.pTree = d3.defaultTree.tree();
                    self.pTree.addEventFunc(self.treeItemClickEvent);
                    self.pTree.createTreeList(self.currentTreeData, self.treeListId);

                    self.treeListMobileId = "treeListMobile";
                    self.pTree.createTreeList(self.currentTreeData, self.treeListMobileId);

                    /* 2018.01.19 bh.ryu
                     * when click refresh button on compare mode
                     * remove dim of treelist
                     */
                    if (self.status === "compareGraph") {
                        d3.select("#" + self.treeListId).selectAll('span').classed("dim", false); //false mean remove class
                        d3.select("#" + self.treeListMobileId).selectAll('span').classed("dim", false);
                    }

                    if (self.callbackAfterMakeTreeList !== undefined && param !== undefined) {
                        self.callbackAfterMakeTreeList(param);
                    } else if (self.callbackAfterMakeTreeList !== undefined) {
                        self.callbackAfterMakeTreeList();
                    }
                    isClickFoldingBtn = false;
                } else {
                    alert("Failed to get tree information.");
                }
        })(obj);
    }

    function initD3(d3) {
        d3.selectAll('button').on('click', null);

        d3.defaultTree = d3.defaultTree || {};
        d3.defaultTree.tree = function () {
            self.canvas = {};
            self.canvas.createTreeList = function (defaultData, viewId) {

                d3.select("#" + viewId).selectAll('ul').remove();
                self.canvas.tree = d3.layout.treelist().childIndent(20).nodeHeight(28);
                self.canvas.ul = d3.select("#" + viewId).append("ul").classed("treelist", "true");
                self.canvas.treeRender(defaultData);//toggle, li insert
                selectTreeNode();
            };

            var clickEventFunc = function () {};
            self.canvas.selectNode = "noSelect";
            self.canvas.treeRender = function (data) {
                var id = 0;
                function render(data, parent) {
                    var nodes = self.canvas.tree.nodes(data), duration = 250; //treelist에 데이터 주입
                    function toggleChildren(d) {
                        isClickFoldingBtn = true;
                        if(self.status === null || self.status === undefined){
                            self.status = "toggleChildren";
                        }
                        if (d.children) {
                            d._children = d.children;
                            d.children = null;
                        } else if (d._children) {
                            d.children = d._children;
                            d._children = null;
                        }
                    }

                    var nodeEls = self.canvas.ul.selectAll("li").data(nodes, function (d) {
                         // "d.renderId" is used the same as "d.id" used to draw a tree on the "Array" page
                          d.renderId = d.renderId || ++id; //d.renderId가 없어도 or 작동으로 해결된다.

                          return d.renderId;
                     });

                    //entered nodes
                    var length = 0;
                    var old = 0;
                    var entered = nodeEls.enter().append("li").attr("class", function (d) {
                        // start .attr("class", function (d)
                        alert("append : " + d.product);

                        var depth = d.depth;    //hierarchy의 기본값 ?
                        var icon = "node";
                        var index;

                        if (depth === 0 && (self.status === undefined || self.status === null) && !isGraphTab) {
                            icon = icon + "1 selected";
                        } else if (depth === 0) {
                            icon = icon + "1";
                        } else if (depth === 1) {
                            //접혀있는 리스트아이콘이 아닐경우만 존재
                            if (typeof d.children !== "undefined") {
                                length = d.children.length;
                            } else {
                                length = 0;
                            }
                            // icon = icon+"2";
                        } else {
                            //depth가 2로 시작시 처음 li
                            if (old !== depth) {
                                //depth 2만을 다시 그렸을 경우
                                if (length === 0) {
                                    length = parent.children.length;
                                }

                                index = "first";
                                if (length === 1) {
                                    index = "only";
                                }
                            } else {
                                index = '';
                            }

                            //depth 2의 마지막 li
                            if (length === 1 && index !== "only") {
                                index = 'last';
                            }

                            icon = icon + "3 " + "index" + index;
                            length--;
                        }
                        old = depth;
                        return icon;
                        // end .attr("class", function (d)
                    })
                            .on("click", function (d) {
                                d3.select("#" + self.treeListId).selectAll('li').classed("selected", false);
                                d3.select("#" + self.treeListMobileId).selectAll('li').classed("selected", false);

                                if (isGraphTab && deviceVersion === "mobile") {
                                    d3.select(this).selectAll('span').style("text-decoration", "none");
                                }

                                if(isClickFoldingBtn){
                                    isClickFoldingBtn = false;
                                    selectTreeNode();
                                }else{
                                    if(!isGraphTab){
                                        d3.select(this).classed("selected", true);
                                    }

                                    lastSelected = d.name;
                                    fromArray = "";
                                    self.canvas.selectNode = d;
                                    selectedDepth = d.depth;
                                    lastSelectedParent = d.parent_name;
                                    clickEventFunc();

                                    selectTreeNode();
                                }
//                                render(data, d);
                            })
                            .style("top", parent.y + "px")
                            .style("opacity", 0)
                            .style("height", self.canvas.tree.nodeHeight() + "px");

                    //add arrows if it is a folder
                    entered.append("i").attr("class", function (d) { //selected Tab and product type에 따라 작동
                        var icon = d.children ? " icon-circle_plus" : d._children ? "icon-circle_minus" : "";
                        return icon;
                    })
                            .on("click", function (d) {
                                if (deviceVersion === 'pc') {  //publicfunction.js
                                    self.canvas.ul = d3.select("#" + self.treeListId).selectAll('ul');
                                } else {
                                    self.canvas.ul = d3.select("#" + self.treeListMobileId).selectAll('ul');
                                }
                                toggleChildren(d);
                                render(data, d);
                            });

                    //add arrows if it is a folder
                    entered.append("i").attr("class", function (d) {
                        var icon = d.children ? "vertical_aligner" : d._children ? "vertical_aligner" : "";
                        return icon;
                    });

                    //add icons for folder for file
                    entered.append("i").attr("class", function (d) {
                        var icon = d.depth === 0 ? "icon-home" : (d.depth === 1 ? "icon-enerbox" : " icon-orga_line");
                        return icon;
                    });

                    entered.append("span").attr("class", "name").html(function (d) {
                        var childrenLength;
                        if (d.eventYn !== null && d.eventYn == 'Y' && isGraphTab) {
//                            $(this).addClass('warn');
                            $(this).addClass('gw_event_error');
                            $('.gw_event_error').css('color', 'red');
                        }

                        if(checkReadyCompareApply() && isGraphTab)
                        {
                            $(this).addClass('dim');
                            if(d.depth === 2 && checkRegisteredId(d.id))
                            {
                                $(this).removeClass('dim');
                            }
                        }

                        if (d.depth === 0) {
                            var numTotalMi = 0;
                            if (d.children !== undefined) {
                                for (var gwIndex = 0; gwIndex < d.children.length; gwIndex++) {
                                    childrenLength = d.children[gwIndex].children !== undefined ? d.children[gwIndex].children.length : 0;
                                    numTotalMi += childrenLength;
                                }
                            }
                            return d.name;/* + "<span class='numChildren'>(" + numTotalMi + ")</span>";*/
                        } else if (d.depth === 1) {
                            childrenLength = d.children === undefined ? 0 : d.children.length;
                            return d.name + "<span class='numChildren'>(" + childrenLength + ")</span>";

                        } else {
                            if(isGraphTab){
                                if (d.eventYn !== null && d.eventYn == 'Y'){
                                    $(this).removeClass('used');
                                    $(this).addClass('event_error');
                                    $('.event_error').css('color', 'red');
                                }
                            }
                            if (self.status === "compareGraph"){
                                if (checkRegisteredId(d.id) === false) {
                                    return d.name + '<label class="chk type_2 and"><input type="checkbox" onchange="checkModuleIdCallback(\'' + d.id + '\')"><i></i></label>';
                                } else {
                                    return d.name + '<label class="chk type_2 and"><input type="checkbox" onchange="checkModuleIdCallback(\'' + d.id + '\')" checked><i></i></label>';
                                }
                            }else{
                                return d.name;
                            }
                        }
                    })
                            .attr("data-moduleId", function (d) {
                                  if(d.depth < 2){
                                        return d.name;
                                  }else if(d.depth === 2){
                                    return d.id;
                                } else {
                                    return '';
                                }
                            }).attr("data-parent", function (d) {
                                  if(d.depth < 2){
                                        return d.name;
                                  }else if(d.depth === 2){
                                    return d.parent_name;
                                } else {
                                    return '';
                                }
                            })
                            .attr("data-address", function (d) {
                                if (d.depth === 2) {
                                    return d.addr;
                                } else {
                                    return '';
                                }
                            });

                    //update caret direction
                    nodeEls.select("i").attr("class", function (d) {
                        var icon =
                          d.children ?
                            ( d.product === "ess" ? " icon-circle_minus dim" : " icon-circle_minus" ) :
                              d._children ?
                                ( d.product === "ess" ? " icon-circle_plus dim" : " icon-circle_plus" ) :
                                  "";
                        return icon;
                    });

                    //update position with transition
                    nodeEls.transition().duration(duration).style("top", function (d) {
                        return (d.y - self.canvas.tree.nodeHeight()) + "px";
                    })
                            .style("left", function (d) {
                                return d.x + "px";
                            })
                            .style("opacity", 1);

                    nodeEls.exit().remove();
                }
                render(data, data);
            };

            self.canvas.addEventFunc = function (functionObj) {
                clickEventFunc = functionObj;
            };
            return self.canvas;
        };
    }

    /**
     * @ description bind a event
     * @ search, Refresh Button,
     */
    function bindEvent() {
        // 1. SearchInput event
        $("#tree-search").unbind(); //jQuery 3.0 unbind() has been deprecated. It was superseded by the .off() method
        $("#tree-search").on('keyup', function (evt) {
            searchByKeyword("tree-search", evt);
        });

        $("#pc-tree-search").unbind();
        $("#pc-tree-search").on('keyup', function (evt) {
            searchByKeyword("pc-tree-search", evt);
        });

        $("#mtree-search").unbind();
        $("#mtree-search").on('keyup', function (evt) {
            searchByKeyword("mtree-search", evt);
        });
        // 2. Refresh Button
        $("#tree-searchRefresh").off("click");
        $("#tree-searchRefresh").on("click", function () {
            if (self.status === undefined || self.status === null) {
                self.status = "refresh";
            }
            makeTreeList();
        });

        $("#pc-tree-searchRefresh").off("click");
        $("#pc-tree-searchRefresh").on("click", function () {
            if (self.status === undefined || self.status === null) {
                self.status = "refresh";
            }
            makeTreeList();
        });

        // 3. Search Icon
        $("#tree-searchIcon").unbind();
        $("#tree-searchIcon").on('click', function () {
            clickSearchIcon("tree-search");
        });

        $("#pc-tree-searchIcon").unbind();
        $("#pc-tree-searchIcon").on('click', function () {
            clickSearchIcon("pc-tree-search");
        });

        $(".icon-search").unbind();
        $(".icon-search").on('click', function () {
            clickSearchIcon("mtree-search");
        });
    }

    //[modified] clickSearchIcon
    function clickSearchIcon(inputId) {
        var id = "#" + inputId;
        if(self.status === undefined || self.status === null)
        {
            self.status = "clickSearchIcon";
        }
        if ($(".icon-search").hasClass("delete")) {
            $("#" + inputId).val('');
            if($("#mtree-search").val() !== "") {
                $("#mtree-search").val("");
            }
            if($("#tree-search").val() !== "") {
                $("#tree-search").val("");
            }
            if($("#pc-tree-search").val() !== "") {
                $("#pc-tree-search").val("");
            }
            defaultTree();
            //if (id === "#tree-search") {
                d3.select("#treeListMobile").selectAll('ul').remove();
                self.pTree.createTreeList(self.currentTreeData, "treeListMobile");
            //} else {
                d3.select(id).selectAll('ul').remove();
                self.pTree.createTreeList(self.currentTreeData, "treelist");
            //}

            $('.icon-search').removeClass('delete');
        } else {
            var e = jQuery.Event("keyup", {which: 13});
            $(id).trigger(e);
        }
    }
    //

    function searchByKeyword(inputId, evt) {
        var id = "#" + inputId;

        if (self.status === undefined || self.status === null) {
            self.status = "search";
        }
//        var keyCode = evt.which ? evt.which : event.keyCode;
        var searchKeyword = $(id).val();
        $('input[id="mtree-search"]').on('keyup', function(evt) {
        var searchKeyword = $('input[id="mtree-search"]').val().trim();
        if (searchKeyword !== "") {
            d3.selectAll('#tree-search').attr('value', searchKeyword);
            d3.selectAll('#pc-tree-search').attr('value', searchKeyword);
            $('input[id="tree-search"]').val(searchKeyword);
            $('input[id="pc-tree-search"]').val(searchKeyword);
            $('.icon-search').addClass('delete');

        } else {
            d3.selectAll('#tree-search').attr('value', '');
            d3.selectAll('#pc-tree-search').attr('value', '');
            d3.selectAll('#mtree-search').attr('value', '');

            $('.icon-search').removeClass('delete');
        }

        });

        $('input[id="pc-tree-search"]').on('keyup', function(evt) {
        var searchKeyword = $('input[id="pc-tree-search"]').val().trim();
        if (searchKeyword !== "") {
            d3.selectAll('#tree-search').attr('value', searchKeyword);
            d3.selectAll('#mtree-search').attr('value', searchKeyword);
            $('input[id="tree-search"]').val(searchKeyword);
            $('input[id="mtree-search"]').val(searchKeyword);
            $('.icon-search').addClass('delete');

        } else {
            d3.selectAll('#tree-search').attr('value', '');
            d3.selectAll('#pc-tree-search').attr('value', '');
            d3.selectAll('#mtree-search').attr('value', '');

            $('.icon-search').removeClass('delete');
        }

        });

        $(this).blur();
        // defined search action
        //[20170329][modified] change the method for searching item in tree list.
        //[Before] search item after cliking on enter key
        //[After] search item by key up event.
        if (searchKeyword !== "") {
            $(id).val(searchKeyword);
            $("#mtree-search").val(searchKeyword);
            $("#mtree-search").addClass('delete');

            $("#tree-search").val(searchKeyword);
            $("#tree-search").addClass('delete');

            $("#pc-tree-search").val(searchKeyword);
            $("#pc-tree-search").addClass('delete');

            $('.icon-search').addClass('delete');

            var text = $.trim(searchKeyword);

            defaultTree();

            var treeValArr = self.currentTreeData;
            if ($.type(treeValArr.children) === 'undefined' && $.type(treeValArr._children) === 'undefined')
                return;

            var searchTree = ($.type(treeValArr.children) === 'undefined' ? ($
                    .type(treeValArr._children) === 'undefined' ? []
                    : treeValArr._children)
                    : treeValArr.children);
            for (var i = 0; i < searchTree.length; i++) {
                var gw = searchTree[i];
                var gwName = gw.name;
//                console.log(gwName);
                var gwChildren = ($.type(gw.children) === 'undefined' ? ($
                        .type(gw._children) === 'undefined' ? []
                        : gw._children)
                        : gw.children);

                for (var j = 0; j < gwChildren.length; j++) {
                    var value = gwChildren[j].name;
                    if (value.toLowerCase().search(text.toLowerCase()) < 0) {
                        gwChildren.splice(j, 1);
                        j = -1;
                    }
                }

                if (gwChildren.length === 0 && gwName.toLowerCase().search(text.toLowerCase()) < 0) {
                    searchTree.splice(i, 1);
                    i = -1;
                }
            }

            if (treeValArr.children) {
                treeValArr.children = searchTree;
            } else if (treeValArr._children) {
                treeValArr._children = searchTree;
            }

            self.currentTreeData = {};
            self.currentTreeData = treeValArr;
            /*if (id === "#tree-search") {
                self.pTree.createTreeList(self.currentTreeData, "treeListMobile");
            } else {
                self.pTree.createTreeList(self.currentTreeData, "treelist");
            }*/
            self.pTree.createTreeList(self.currentTreeData, "treelist");
            self.pTree.createTreeList(self.currentTreeData, "treeListMobile");
            $(".numChildren").addClass("hide");

        } else {

            defaultTree();
            self.canvas.ul.selectAll("li").remove();
            //console.log("removeClass delete treelist");
            self.pTree.createTreeList(self.currentTreeData, "treelist");
            self.pTree.createTreeList(self.currentTreeData, "treeListMobile");
            $("#tree-search").val("");
            $("#pc-tree-search").val("");
            $("#mtree-search").val("");
            $('.icon-search').removeClass('delete');
        }

    }

    function loadTreeIDList(arr) {
        var currentData = arr;
        var treeList = {};
        treeList.name = currentData.system_name;
        treeList.eventYn = currentData.event_yn;
        treeList.children = [];

        $.each(currentData.gateways, function (i, group) {
            var gateWay = {};
            gateWay.name = group.gw_serial_no;
            gateWay.eventYn = group.event_yn;
            gateWay.product = "gateway";
            gateWay.children = [];
            $.each(group.mis, function (j, addr) {
                var mac = {};

                var macAddr = addr.mac_address;
                macAddr = convertMiMacAddresToView(macAddr);
                mac.id = addr.module_id;
                mac.name = addr.module_id;
                mac.eventYn = addr.event_yn;
                mac.addr = addr.mac_address;
                mac.product = "mi";
                mac.parent_name = addr.gw_serial_no;
                gateWay.children.push(mac);
            });
            treeList.children.push(gateWay);
        });

        $.each(currentData.esslist, function (i, egroup) {
            var ess = {};
            ess.name = egroup.ess_serial_no;
            ess.eventYn = egroup.event_yn;
            ess.product = "ess";
            ess.children = [];
            if(egroup.pv !== "" && egroup.pv !== undefined){
              var sub = {};
              sub.id = "PV";
              sub.name = "PV";
              sub.eventYn = "N";
              sub.addr = "ADDR";
              sub.product = "sub";
              sub.parent_name = egroup.ess_serial_no;
              ess.children.push(sub);
            }
            if(egroup.battery !== "" && egroup.battery !== undefined){
              var sub = {};
              sub.id = "BATTERY";
              sub.name = "BATTERY";
              sub.eventYn = "N";
              sub.addr = "ADDR";
              sub.product = "sub";
              sub.parent_name = egroup.ess_serial_no;
              ess.children.push(sub);
            }
            if(egroup.grid !== "" && egroup.grid !== undefined){
              var sub = {};
              sub.id = "GRID";
              sub.name = "GRID";
              sub.eventYn = "N";
              sub.addr = "ADDR";
              sub.product = "sub";
              sub.parent_name = egroup.ess_serial_no;
              ess.children.push(sub);
            }
            treeList.children.push(ess);
        });
        return treeList;
    }

    this.callbackRefresh = function (fnCallback, status) {
        self.treeItemClickEvent = fnCallback;

        self.status = status;
        self.pTree = d3.defaultTree.tree();
        self.pTree.addEventFunc(self.treeItemClickEvent);
        //self.pTree.createTreeList(self.basicData);

        // Common mobile treelist
        self.treeObject = d3.defaultTree.tree();
        self.treeObject.addEventFunc(self.treeItemClickEvent);
        //self.treeObject.createTreeList("treeListMobile", self.basicData);
    };

    function defaultTree() {
        self.currentTreeData = {};
        $.extend(true, self.currentTreeData,
                self.basicData);
        $.each(self.currentTreeData.children, function (i, data) {
            var childrenData = data.children;
            $.each(self.usedTreeData, function (j, used) {
                $.each(childrenData, function (k, value) {
                    if (value.name === used) {
                        childrenData.splice(k, 1);
                        return false;
                    }
                });
            });
        });
    }

    function selectTreeNode()
    {
        if(fromArray !== "" && !isGraphTab)
        {
            $('.treelist').find('span[data-moduleId="' + fromArray + '"]').closest('li').addClass('selected');
        }else if(lastSelected !== ""  && !isGraphTab)
        {
            switch (selectedDepth)
            {
                case 0:
                    $('.treelist .node1').find('span[data-moduleId="' + lastSelected + '"]').closest('li').addClass('selected');
                    break;
                case 1:
                    $('.treelist .node').find('span[data-moduleId="' + lastSelected + '"]').closest('li').addClass('selected');
                    break;
                case 2:
                    $('.treelist .node3').find('span[data-parent="' + lastSelectedParent + '"]' +
                            'span[data-moduleId="' + lastSelected + '"]').closest('li').addClass('selected');
                    break;
            }
        }
    }

    function convertMiMacAddresToView(macAddr, isDigitFully){
      if( isDigitFully === undefined || isDigitFully === null || isDigitFully !== true){
        macAddr = macAddr.substring(macAddr.length-6, macAddr.length);
      }

      var quotient = macAddr.length/2;

      var retMacAddr = "";
      for(var i=0; i<quotient; i++){
        retMacAddr += macAddr.substring(i*2,(i+1)*2);

        if(i!== quotient-1){
          retMacAddr +=":";
        }
      }
      return retMacAddr;
    }
}
