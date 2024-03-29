sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/m/library",
	"sap/base/util/uid",
	"sap/ui/core/format/DateFormat",
	/*"sap/ui/model/odata/type/Guid",*/

], function(BaseController,
	JSONModel,
	formatter,
	mobileLibrary	,
	uid,
	DateFormat
	 ) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;

	function _calculateOrderTotal (fPreviousTotal, oCurrentContext) {
		var fItemTotal = oCurrentContext.getObject().Quantity * oCurrentContext.getObject().UnitPrice;
		return fPreviousTotal + fItemTotal;
	}
	return BaseController.extend("int.training.reservation.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit : function () {  
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			this.vMode = "";
			this._aValidKeys = ["carsDetail", "driverDetail"];
			var oViewModel = new JSONModel({  
				busy : false,
				delay : 0,
				lineItemListTitle : this.getResourceBundle().getText("detailLineItemTableHeading"),
				// Set fixed currency on view model (as the OData service does not provide a currency).
				currency : "TRY",
				// the sum of all items of this order
				totalOrderAmount: 0,
				selectedTab: ""
			});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			this.setModel(oViewModel, "detailView");

			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));

			var m = new sap.ui.model.json.JSONModel();
			m.setData({
				visparam1: true,
				visparam2: false,
			

			});
			this.getView().setModel(m, "VISIABLE");
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onSendEmailPress : function () {
			var oViewModel = this.getModel("detailView");

			URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},


		/**
		 * Updates the item count within the line item table's header
		 * @param {object} oEvent an event containing the total number of items in the list
		 * @private
		 */
		onListUpdateFinished : function (oEvent) {
			var sTitle,
				fOrderTotal = 0,
				iTotalItems = oEvent.getParameter("total"),
				oViewModel = this.getModel("detailView"),
				oItemsBinding = oEvent.getSource().getBinding("items"),
				aItemsContext;

			// only update the counter if the length is final
			if (oItemsBinding.isLengthFinal()) {
				if (iTotalItems) {
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
				} else {
					//Display 'Line Items' instead of 'Line items (0)'
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
				}
				oViewModel.setProperty("/lineItemListTitle", sTitle);

				aItemsContext = oItemsBinding.getContexts();
				fOrderTotal = aItemsContext.reduce(_calculateOrderTotal, 0);
				oViewModel.setProperty("/totalOrderAmount", fOrderTotal);
			}

		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched : function (oEvent) {
			var oArguments = oEvent.getParameter("arguments");
			this._sObjectId = oArguments.objectId;
			// Don't show two columns when in full screen mode
			if (this.getModel("appView").getProperty("/layout") !== "MidColumnFullScreen") {
				this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			}
			this.getModel().metadataLoaded().then( function() {  
				var sObjectPath = this.getModel().createKey("VehicleSet", {
					Plate :  this._sObjectId
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));
//	var oText = sap.ui.getCore().getModel("Reserved");
/* var sReserved = this.getView().byId("sReserved");
			switch ("sReserved") {
				case "X":
					var n = new sap.ui.model.json.JSONModel();
					n.setData({
						visparam1: true,
						visparam2: false,

					});
				case "":
					var n = new sap.ui.model.json.JSONModel();
					n.setData({
						visparam1: false,
						visparam2: true,

					});
					break;
				default:
				break;
			}
 */


			var oQuery = oArguments["?query"];
			if (oQuery && this._aValidKeys.indexOf(oQuery.tab) >= 0){
				this.getView().getModel("detailView").setProperty("/selectedTab", oQuery.tab);
				this.getRouter().getTargets().display(oQuery.tab);
			} else {
				this.getRouter().navTo("object", {
					objectId: this._sObjectId,
					query: {
						tab: "carsDetail"
					}
				}, true);
			}
		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView : function (sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			this.getView().bindElement({
				path : sObjectPath,
				parameters: {
					// expand: "Customer,Order_Details/Product,Employee"
					expand: "ToReservation"
				},
				events: {
					change : this._onBindingChange.bind(this),
					dataRequested : function () {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function () {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange : function () {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}

			var sPath = oElementBinding.getPath(),
				oResourceBundle = this.getResourceBundle(),
				oObject = oView.getModel().getObject(sPath),
				sObjectId = oObject.Plate,
				sObjectName = oObject.Plate,
				oViewModel = this.getModel("detailView");

			this.getOwnerComponent().oListSelector.selectAListItem(sPath);

			oViewModel.setProperty("/shareSendEmailSubject",
				oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
			oViewModel.setProperty("/shareSendEmailMessage",
				oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href, oObject.ShipName, oObject.EmployeeID, oObject.CustomerID]));
		},

		_onMetadataLoaded : function () {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView"),
				oLineItemTable = this.byId("lineItemsList"),
				iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);
			oViewModel.setProperty("/lineItemTableDelay", 0);

			oLineItemTable.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for line item table
				oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
			});

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},
		onTabSelect : function(oEvent){
			var sSelectedTab = oEvent.getParameter("selectedKey");
			this.getRouter().navTo("object", {
				objectId: this._sObjectId,
				query: {
					tab: sSelectedTab
				}
			}, true);// true without history

		},

		_onHandleTelephonePress : function (oEvent){
			var sNumber = oEvent.getSource().getText();
			URLHelper.triggerTel(sNumber);
		},

		/**
		 * Set the full screen mode to false and navigate to master page
		 */
		onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			// No item should be selected on master after detail page is closed
			this.getOwnerComponent().oListSelector.clearMasterListSelection();
			this.getRouter().navTo("master");
		},

		/**
		 * Toggle between full and non full screen mode.
		 */
		toggleFullScreen: function () {
			var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
			if (!bFullScreen) {
				// store current layout and go full screen
				this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
				this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
			} else {
				// reset to previous layout
				this.getModel("appView").setProperty("/layout",  this.getModel("appView").getProperty("/previousLayout"));
			}

		},

		onPressStartReservation: function() {
			this.vMode = "C";
			this._getNewReservationDialog(this).open();
		},
		onPressFinishReservation: function() {
			this.vMode = "C";
			this._getNewReservationDialog(this).open();
		},
		_getNewReservationDialog: function(that) {
		/*	that._oNewReservationDialog = sap.ui.getCore().byId("dialogNewReservation");*/
			if (!that._oNewReservationDialog) {
				that._oNewReservationDialog = sap.ui.xmlfragment("int.training.reservation.fragment.CreateReservation",
					that);
				that.getView().addDependent(that._oNewReservationDialog);
				jQuery.sap.syncStyleClass("sapUiSizeCompact", that.getView(), that._oNewReservationDialog);
			}
			return that._oNewReservationDialog;
		},
		onPressReservationSave: function() {
		/*	var oUploadSet = sap.ui.getCore().byId("/RezervationSet");*/
			/*var oModel = oSelectedItem.getBindingContext().getPath();*/
		/*	if ( cFiles > 0 ){
				this.Guid.uid();
				oUploadSet.upload();
			}
*/


const dateFormatter = DateFormat.getDateTimeInstance({ pattern: "dd/MM/yyyy" });

var startingDate = sap.ui.getCore().byId("inputStartingDate").getValue();
var endingDate = sap.ui.getCore().byId("inputEndingDate").getValue();



			var sCar = {
				Guid : uid(),
				Plate: sap.ui.getCore().byId("inputPlate").getValue(),
				Driver: sap.ui.getCore().byId("inputMarka").getValue(),
				Driver: sap.ui.getCore().byId("inputModel").getValue(),
				Driver: sap.ui.getCore().byId("inputDriver").getValue(),
				Startdate: dateFormatter.parse(startingDate),
				Enddate: dateFormatter.parse(endingDate),

			};

			if (this.vMode === "C") {
				//Create Method
				this.getView().getModel().create("/ReservationSet", sCar, {
					success: function(oData, oResponse) {

					},
					error: function(oResponse) {

					}
				});
			} else {
				//Update Method
				/*this.getView().getModel().update("/ReservationSet(Driver='" + this.sCar.Driver + "',startingDate='" + this.sCar.startingDate + "',endingDate='" + this.sCar.endingDate + "')", sCar, {
					success: function(oData, oResponse) {

					},
					error: function(oResponse) {

					}
				});*/
			}

		},
		onPressCancelReservation: function() {

			sap.ui.getCore().byId("inputDriver").setValue("");
			sap.ui.getCore().byId("inputStartingDate").setValue("");
			sap.ui.getCore().byId("inputEndingDate").setValue("");
			this._getNewReservationDialog(this).close();
		}
	});
});