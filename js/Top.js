var cartOpen = false; // True of false, if the carts popup window is open
var originalCartState = null; // Saving the state or cart originally
const MAX_CHARS_IN_CART_NAME = 15;

// Obtained from https://stackoverflow.com/questions/1726630/formatting-a-number-with-exactly-two-decimals-in-javascript
// Formatting a number to an exact 2 decimals following currency
var formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

// At any time, the user may click on the object to add or remove items from the cart
$(document).ready(function () {
    // Obtained from https://stackoverflow.com/questions/34896106/attach-event-to-dynamic-elements-in-javascript
    // Dynamic button pressed, with attached event
    document.addEventListener('click', function (e) {
        if (e.target && e.target.id == 'addToCart') {
            addCartItem(e);
        }
        else if (e.target && e.target.id == 'removeFromCart') {
            removeCartItem(e);
        }
    });

    updateCart(getCurrentOrder());
});

function displayAddress() {
    try {
        document.getElementById("deliveryAddress").value = getUserAddress();
    } catch (err) {
        alert("Please include User.js before IncludeTop.js.\nThey are dependant on one another.");
    }
}

// Called when the user enters a new address in the address bar
function modifyAddress(input) {
    try {
        setUserAddress (input.trim());
    } catch (err) {
        alert("Please include User.js before IncludeTop.js.\nThey are dependant on one another.");
    }
}

/*
    Adds the food to the cart
    All you need to pass as parameters is the name of the food item
    NOTE: This name MUST match with one from database.js
    Updates the cart accordingly
*/
function addContentsToCart(foodName) {
    // When you add to the cart, the notification appears
    if (!cartOpen) {
        document.getElementById('cartNotification').style.visibility = 'visible';
        window.localStorage.setItem('notification', 'true');
    }
    foodNameInstr = foodName.split('/');

    updateCart(addFoodToCartCookie(getFoodItemByName(foodNameInstr[0]), foodNameInstr[1]));
}

// Updates the cart visually to append all elements to the cart
// I know this isn't an optimal solution, since I erase and rewrite every element
// But it will be fine for our purposes, and the number of elements will practically always be small (< 10)
function updateCart(allFoodNamesCookieKey) {
    var orders = document.getElementById("allOrders");
    var elem = document.getElementById("totalsSection");

    if (originalCartState == null)
        originalCartState = orders.innerHTML;

    // No food has been ordered yet
    if (allFoodNamesCookieKey == "" || allFoodNamesCookieKey == null || allFoodNamesCookieKey == ',') {
        orders.innerHTML = originalCartState;

        // Erase totals display if it exists
        if (elem != null)
            elem.style.display = "none";

        // If we have a coupon, then we'll reset the display back to the first state
        var coupon = window.localStorage.getItem("coupon");

        if (coupon != null) {
            displayCouponInformation(total);
        }

        return;
    }

    orders.innerHTML = "";
    elem.style.display = "inline";

    // Each item is split by comma
    var food = allFoodNamesCookieKey.split(",");

    // Counting any duplicates 
    var nonDupes = [];
    var dupeCount = []; // The number of elements, cooresponds to the index of nonDupes

    for (var i = 0; i < food.length; i++) {
        if (food[i] == null)
            continue;

        food[i] = food[i].trim();

        if (food[i] == ',/' || food[i] == "" || food[i] == ',' || food[i] == '/') // Remove any Empty split
            continue;

        var index = nonDupes.indexOf(food[i]);
        if (index != -1) {
            dupeCount[index]++;
        }
        else {
            nonDupes.push(food[i]);
            dupeCount.push(1);
        }
    }

    var FoodItemObject = null;

    try {
        var sumPrice = 0;

        // Go through each non-duplicate food item in the order, then display it
        // This will also display the total prices of the order
        for (var i = 0; i < nonDupes.length; i++) {
            FoodItemObject = getFoodItemByName(nonDupes[i]);

            if (FoodItemObject == null) {
                alert("Incorrect names for food items detected, please check the console encase of any errors.");
                return;
            }

            var instructions = nonDupes[i].split('/')[1].trim();
                    
            // Create objects
            var order = document.createElement("div");
            var price = document.createElement("span");
            var count = document.createElement("span");
            var name = document.createElement("span");
            var instructionsObj = document.createElement("span");
            var addRemoveSection = document.createElement("div");
            var add = document.createElement("button");
            var remove = document.createElement("button");
            //var leftBar = document.createElement("span");
            //var rightBar = document.createElement("span");

            // Creating content for Add/Remove from cart for the specific item
            //leftBar.textContent = "[ ";
            add.textContent = "+"
            //rightBar.textContent = " ]";
            remove.textContent = "-";

            instructionsObj.textContent = instructions;

            //addRemoveSection.appendChild(leftBar);
            addRemoveSection.appendChild(instructionsObj);
            addRemoveSection.appendChild(add);
            addRemoveSection.appendChild(remove);
            //addRemoveSection.appendChild(rightBar);


            price.className = "price";
            order.className = "order";
            count.className = "count";
            addRemoveSection.id = "addRemove";
            add.className = "addToCart";
            name.className = "itemName";
            remove.className = "removeFromCart";
            instructionsObj.className = "specialInstructions";
            add.id = "addToCart";
            remove.id = "removeFromCart";
            //leftBar.className = "bar";
            //rightBar.className = "bar";

            // Settings content values
            price.textContent = " $" + formatter.format (FoodItemObject.price * dupeCount[i]);
            count.textContent = " x" + dupeCount[i];

            // Only allow a certain number of characters in the name
            var nameUsed = FoodItemObject.name;

            /*
            // Breaks cart
            if (nameUsed.length > MAX_CHARS_IN_CART_NAME) {
                nameUsed = nameUsed.substring(0, MAX_CHARS_IN_CART_NAME) + '...';
            }
            */
            name.textContent = nameUsed;

            // order.textContent = nameUsed;

            // Appending children
            order.appendChild(name);
            order.appendChild(count);
            order.appendChild(price);
            orders.appendChild(order);
            order.appendChild(addRemoveSection);

            sumPrice = sumPrice + (FoodItemObject.price * dupeCount[i]);
        }
        
        // ASSUMPTION: Manitoba's taxes
        var GST = sumPrice * 0.05;
        var PST = sumPrice * 0.07;
        var total = sumPrice + GST + PST;

        // Truncating decimals
        sumPrice = formatter.format(sumPrice);
        GST = formatter.format(GST);
        PST = formatter.format(PST);
        total = formatter.format(total);

        // Now we will set the prices
        // Subtotal
        getPriceChild(document.getElementById("subtotal")).textContent = "$" + sumPrice;
        // GST
        getPriceChild(document.getElementById("GST")).textContent = "$" + GST;
        // PST
        getPriceChild(document.getElementById("PST")).textContent = "$" + PST;
        // Total
        getPriceChild(document.getElementById("Total")).textContent = "$" + total;


        var coupon = window.localStorage.getItem("coupon");

        if (coupon != null) {
            displayCouponInformation(total);
        }
    }
    catch (err) {
        alert(err + " " + err.lineNumber);
        alert("Sorry, a problem has occurred. Please try again. \0 User.js required.");
    }
}

// Displaying coupon information
// This includes a new total price [If any]
// As well as a description of the coupon
function displayCouponInformation(currentTotal) {
    var couponIndex = parseInt(window.localStorage.getItem("coupon"));

    // Do not display the actual total if it is negative, in that case there's nothing in the cart
    if (currentTotal >= 0) {
        var totalPriceObj = getPriceChild(document.getElementById("Total"));

        if (totalPriceObj  == null) {
            alert("Sorry, a problem has occurred as we were not able to calculate your total price. Please try again later.");
            return;
        }

        var priceAfterCoupon = GetTotalCouponPrice(couponIndex, currentTotal);

        // If there was no price change, then that means the coupon did not apply.
        // Lets tell the user why!
        if (priceAfterCoupon == currentTotal) {
            document.getElementById("tipSection").style.visibility = "visible";
            document.getElementById("tipText").textContent = getCouponNote(couponIndex);

            // Removing information if it was previously shown
            totalPriceObj.style.textDecoration = "none";

            // Actual Total
            // This is only calculated if the user has a coupon that will be applied to the cart
            var actualTotalObj = document.getElementById("totalAfterCoupon");
            actualTotalObj.style.visibility = "hidden";
        }
        else {
            document.getElementById("tipSection").style.visibility = "hidden";

            // Grabbing new total
            totalPriceObj.style.textDecoration = "line-through";

            // Actual Total
            // This is only calculated if the user has a coupon that will be applied to the cart
            var actualTotalObj = document.getElementById("totalAfterCoupon");
            var priceAfterCoupon = GetTotalCouponPrice(couponIndex, currentTotal);
            actualTotalObj.textContent = "$" + formatter.format(priceAfterCoupon);
            actualTotalObj.style.visibility = "visible";
        }

        // Modify coupon
        modifyCoupons(couponIndex);
    }
    else {

        // Showing the user their coupon [ONLY]
        modifyCoupons(couponIndex);
    }
}

function modifyCoupons(couponIndex) {
    // Showing the user their coupon [ONLY]
    var showCouponObj = document.getElementById("Coupon");
    showCouponObj.textContent = coupons[couponIndex];
    var title = document.getElementById("CouponTitle");
    title.style.visibility = "visible";

    var foodItems = getFoodCookies();

    // Makes the display of the coupon in the middle of the cart
    // FIXME if you ever change the height of the pop up cart or adjust sizes, you may need to adjust this as well
    if (foodItems == null || foodItems == "")
    {
        document.getElementById("CouponTitle").style.marginTop = "147px";
    }
    else {
        // If we have made an order, then we move the coupon's title slightly
        document.getElementById("CouponTitle").style.marginTop = "78px";
    }
}

// Adds the item to the cart
// Assumption: The text contained the items name followed by a 'xn', for any numbers n
function addCartItem(event) {
    var foodName = event.target.parentNode.parentNode.textContent.trim();
    foodName = getFoodName(foodName); 

    // Grab special instructions
    var instrObj = getInstructionsChild(event.target.parentNode);

    // Update cart once added
    updateCart(addFoodToCartCookieByName(foodName + '/' + instrObj.textContent));
}

// Removes the item to the cart
// Assumption: The text contained the items name followed by a '$'
function removeCartItem(event) {
    var foodName = event.target.parentNode.parentNode.textContent.trim();
    foodName = getFoodName(foodName); // .substring(0, foodName.indexOf('$')); KEEP COMMENT IN CASE OF REVERSION

    // Grab special instructions
    var instrObj = getInstructionsChild(event.target.parentNode);

    // Update cart once removed
    updateCart(removeFoodCartCookie(foodName + '/' + instrObj.textContent));
}

// Removing a cart item with only its name
// First it will check for special instructions, otherwise only name
function removeCartItemByName(nameAndInstr) {
    // Update cart once removed
    updateCart(removeItemByNameInstrCheck(nameAndInstr));
}

// Returns the span element containing the special instructions
function getInstructionsChild(orderObj) {
    // First find the element named 'addRemove'
    var child = orderObj.childNodes;

    for (var i = 0; i < child.length; i++) {
        if (child[i].className == 'specialInstructions')
            return child[i];
    }

    return null; // Error
}

// Returns a food name given a string that contains the foodname xamount $price
function getFoodName(string) {
    var curString = "";
    var xDetected = false;

    for (var i = 0; i < string.length; i++) {
        if (string[i] == 'x') {
            // Test for number
            xDetected = true;
        } else if (xDetected) {
            try {
                parseInt(string[i]);
                break;
                // This was the end of the name

            } catch (err) {
                xDetected = false;
                curString += string[i];
                continue;
            }
        }
        else {
            curString += string[i];
        }
    }

    return curString.trim();
}

// Given the entire innerHTML of an order in the cart
// Return the name of item that was ordered
// Assumption: The name of the item stops at '<'
function itemNameFromWholeText(wholeText) {
    return wholeText.substring(0, wholeText.indexOf('<'));
}

// Returns the 'price' child of the span object
// This is specifically for the totalsSection in Top.html
// And will return the cooresponding span object that contains the price
function getPriceChild(spanObject) {
    var childs = spanObject.childNodes;

    for (var i = 0; i < childs.length; i++)
        if (childs[i].className == "price")
            return childs[i];

    return null;
}

// Open the carts pop up window
// Returns true if the cart was opened or closed
function openCart() {
    if (cartOpen)
        return closeCart();
    cartOpen = true;

    var cart = document.getElementById("cartPopUp");
    document.getElementById('cartNotification').style.visibility = 'hidden';
    window.localStorage.setItem('notification', 'false');
    cart.style.display = "inline-block";

    return true;
}

// Close the carts pop up window
// Returns true if the cart was closed
function closeCart() {
    if (!cartOpen)
        return false;
    cartOpen = false;

    var cart = document.getElementById("cartPopUp");
    cart.style.display = "none";

    return true;
}

function makeOrder() {
    alert("Order has been made!");
    alert("This page is not created yet");
}

function correctFormat(str) {
    var hasNumber = false;
    var hasWord = false;
    str = str.trim();
    if (str == "") {
        validInput();
        return false;
    }

    for (var i = 0; i < str.length; i++) {
        if (!hasNumber && str.charAt(i) >= '0' && str.charAt(i) <= '9') {
            hasNumber = true;
        }
        else if (!hasNumber && (str.charAt(i) < '0' || str.charAt(i) > '9')) {
            invalidInput();
            return false;
        }

        if (hasNumber && (str.charAt(i) >= 'a' && str.charAt(i) <= 'z') || (str.charAt(i) >= 'A' && str.charAt(i) <= 'Z') && !hasWord) {
            hasWord = true;
        }

        // Can't have a number after the word
        if (hasWord && str.charAt(i) >= '0' && str.charAt(i) <= '9') {
            invalidInput();
            return false;
        }
    }

    // Show the user the problem after 4 numbers
    if (hasNumber && !hasWord && str.length > 4)
        invalidInput();

    if (hasWord && hasNumber) {
        validInput();
        return true;
    }

    return false;
}

function invalidInput() {
    document.getElementById("failedFeedback").style.display = "block";
}

function validInput() {
    document.getElementById("failedFeedback").style.display = "none";
}

function goCheckout() {
    var obj = document.getElementById("empty-message");

    // We have an order
    if (obj == null) {
        // Redirect the user to checkout page
        window.location = "Checkout.html";
    }
    else {
        // No order, display error message
        checkOutFeedbackAnimation();
    }
}

function checkOutFeedbackAnimation() {
    $("#checkoutFailure").fadeIn("slow", function () {
        document.getElementById("checkoutFailure").style.opacity = "3.0"; // Slower fadeout
        $("#checkoutFailure").fadeOut(8000, function () {
            // Do nothing once complete
        });
    });
}