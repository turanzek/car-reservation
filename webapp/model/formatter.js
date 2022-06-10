sap.ui.define([
	"sap/ui/model/type/Currency"
], function (Currency) {
	"use strict";

	return {

		/**
		 * Rounds the currency value to 2 digits
		 *
		 * @public
		 * @param {string} sValue value to be formatted
		 * @returns {string} formatted currency value with 2 digits
		 */
		currencyValue: function (sValue) {
			if (!sValue) {
				return "";
			}
			return parseFloat(sValue).toFixed(2);
		},

		/**
		 * Rounds the currency value to 2 digits
		 *
		 * @public
		 * @param {number} iQuantity product quantity
		 * @param {number} fPrice product price
		 * @param {string} sCurrencyCode currency code for the price
		 * @returns {string} formatted currency value with 2 digits
		 */
		calculateItemTotal: function (iQuantity, fPrice, sCurrencyCode) {
			var oCurrency = new Currency({showMeasure: false});
			var fTotal = iQuantity * fPrice;
			return oCurrency.formatValue([fTotal.toFixed(2), sCurrencyCode], "string");
		},

		/**
		 * Converts a binary string into an image format suitable for the src attribute
		 *
		 * @public
		 * @param {string} vData a binary string representing the image data
		 * @returns {string} formatted string with image metadata based on the input or a default image when the input is empty
		 */
		handleBinaryContent: function(vData){
			if (vData) {
				var sMetaData1 = 'data:image/jpeg;base64,';
				var sMetaData2 = vData.substr(104); // stripping the first 104 bytes from the binary data when using base64 encoding.
				return sMetaData1 + sMetaData2;
			} else {
				return "../images/Employee.png";
			}
		},

		/**
		 * Provides a text to indicate the delivery status based on shipped and required dates
		 *
		 * @public
		 * @param {object} oReserved required date of the order
		 * @returns {string} delivery status text from the resource bundle
		 */
		ReserveText: function (oReserved) {
			var oResourceBundle = this.getModel("i18n").getResourceBundle();

	
			// delivery is urgent (takes more than 7 days)
			if (oReserved === ""	) {
				return oResourceBundle.getText("formatterReserveAvailable");
			}  else { // delivery is in time
				return oResourceBundle.getText("formatterReserveNotAvailable");
			}
		},

		/**
		 * Provides a semantic state to indicate the delivery status based on shipped and required dates
		 *
		 * @public
		 * @param {object} oReserved required date of the order
		 * @returns {string} semantic state of the order
		 */
		ReserveState: function (oReserved) {
			
			// delivery is urgent (takes more than 7 days)
			if (oReserved === "" ) {
				return "Success";
			} else { // delivery is in time
				return "Error";
			}
		}
	};
});