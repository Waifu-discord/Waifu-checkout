document.addEventListener('DOMContentLoaded', function() {
  const serverIdInput = document.getElementById('server-id');
  const paypalButtonContainer = document.getElementById('paypal-button-container');

  function renderPayPalButton() {
    window.paypal.Buttons({
      style: {
        shape: "rect",
        layout: "vertical",
        color: "gold",
        label: "paypal",
      },
      onInit: function(data, actions) {
        actions.disable();
        paypalButtonContainer.classList.add('paypal-button-container-disabled');

        serverIdInput.addEventListener('input', function() {
          if (serverIdInput.value.trim().length > 0) {
            actions.enable();
            paypalButtonContainer.classList.remove('paypal-button-container-disabled');
          } else {
            actions.disable();
            paypalButtonContainer.classList.add('paypal-button-container-disabled');
          }
        });
      },
      async createOrder() {
        try {
          const response = await fetch("http://localhost:8888/api/orders", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              cart: [
                {
                  id: "YOUR_PRODUCT_ID",
                  quantity: "YOUR_PRODUCT_QUANTITY",
                },
              ],
            }),
          });

          const orderData = await response.json();

          if (orderData.id) {
            return orderData.id;
          }
          const errorDetail = orderData?.details?.[0];
          const errorMessage = errorDetail
              ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
              : JSON.stringify(orderData);

          throw new Error(errorMessage);
        } catch (error) {
          console.error(error);
        }
      },
      async onApprove(data, actions) {
        try {
          const response = await fetch(`http://localhost:8888/api/orders/${data.orderID}/capture`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          });

          const orderData = await response.json();

          const errorDetail = orderData?.details?.[0];

          if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
            return actions.restart();
          } else if (errorDetail) {
            throw new Error(`${errorDetail.description} (${orderData.debug_id})`);
          } else if (!orderData.purchase_units) {
            throw new Error(JSON.stringify(orderData));
          } else {
            const transaction =
                orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
                orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
            resultMessage(
                `Transaction ${transaction.status}: ${transaction.id}`
            );
            console.log(
                "Capture result",
                orderData,
                JSON.stringify(orderData, null, 2)
            );
          }
        } catch (error) {
          console.error(error);
          resultMessage(
              `Sorry, your transaction could not be processed...<br><br>${error}`
          );
        }
      },
    }).render("#paypal-button-container");
  }

  renderPayPalButton();
});

// Define the resultMessage function to display messages to the user
function resultMessage(message) {
  const messageContainer = document.getElementById("result-message");
  messageContainer.innerHTML = message;
}
