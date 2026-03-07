let db;
let cart = [];
const SHOP_NAME = "COFFEE STOCK APP";

// IMPORTANT: If you already have data in your IndexedDB,
// you MUST increment this version number (e.g., from 11 to 12)
// for the `onupgradeneeded` function to run and update the 'products' store schema
// to include the 'category' field.
let request = indexedDB.open("CoffeeStockDB", 12); // <-- MAKE SURE THIS IS A NEW, HIGHER NUMBER THAN YOUR LAST VERSION

request.onupgradeneeded = function (e) {
    db = e.target.result;
    if (!db.objectStoreNames.contains("ingredients")) {
        db.createObjectStore("ingredients", { keyPath: "id", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", { keyPath: "id", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("sales")) {
        db.createObjectStore("sales", { keyPath: "id", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("usages")) {
        db.createObjectStore("usages", { keyPath: "id", autoIncrement: true });
    }
};

request.onsuccess = function (e) {
    db = e.target.result;
    showDashboard();
};

// --- NAVIGATION & DASHBOARD ---
function showDashboard() {
    document.getElementById("mainContent").innerHTML = `<h2>Inventory Dashboard</h2><div id="ingredientList"></div>`;
    loadIngredients();
}

function loadIngredients() {
    let tx = db.transaction(["ingredients"], "readonly");
    let store = tx.objectStore("ingredients");
    let request = store.getAll();

    request.onsuccess = function () {
        let container = document.getElementById("ingredientList");
        container.innerHTML = "";
        container.style = "display: flex; flex-direction: column; align-items: center; width: 100%;";

        request.result.forEach(item => {
            let packsRemaining = item.totalStock / item.packSize;
            container.innerHTML += `
                <div class="ing-item" style="width: 80%; max-width: 600px; padding: 15px; margin: 5px 0; font-size: 1.2rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee;">
                    <div>
                        <strong style="font-size: 1.4rem;">${item.name}</strong> <small>(${item.category})</small><br>
                        <span>Stock: <strong>${item.totalStock}</strong> ${item.baseUnit} | Packs: <strong>${Math.floor(packsRemaining)}</strong></span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="number" style="width:80px; padding: 8px; font-size: 1rem;" id="use-${item.id}" placeholder="${item.baseUnit}">
                        <button class="btn-use" style="padding: 8px 15px;" onclick="useStock(${item.id})">Use</button>
                        <button class="btn-del" style="padding: 8px 15px;" onclick="deleteIngredient(${item.id})">Delete</button>
                    </div>
                </div>`;
        });
    };
}

function deleteIngredient(id) {
    if (confirm("Are you sure you want to delete this ingredient?")) {
        let tx = db.transaction(["ingredients"], "readwrite");
        tx.objectStore("ingredients").delete(id);
        tx.oncomplete = loadIngredients;
    }
}

function useStock(id) {
    let amount = parseFloat(document.getElementById("use-" + id).value);
    if (!amount || amount <= 0) return alert("Enter valid amount");
    let tx = db.transaction(["ingredients", "usages"], "readwrite");
    let ingStore = tx.objectStore("ingredients");
    let usageStore = tx.objectStore("usages");
    let request = ingStore.get(id);
    request.onsuccess = function () {
        let item = request.result;
        if (amount > item.totalStock) return alert("Not enough stock!");
        item.totalStock -= amount;
        ingStore.put(item);

        usageStore.add({
            ingredient: item.name.toLowerCase(),
            amount: amount,
            unit: item.baseUnit,
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date()
        });

        loadIngredients();
    };
}

// --- ADD INGREDIENTS ---
function showAddCoffee() {
    document.getElementById("mainContent").innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 70vh; font-size: 1.3rem;">
            <h2 style="font-size: 2rem; margin-bottom: 20px;">Add Coffee Ingredient</h2>
            <input id="name" style="width: 350px; padding: 15px; margin-bottom: 15px; font-size: 1.1rem;" placeholder="Ingredient Name">
            <input id="packSize" type="number" style="width: 350px; padding: 15px; margin-bottom: 15px; font-size: 1.1rem;" placeholder="Pack Size">
            <select id="unit" style="width: 380px; padding: 15px; margin-bottom: 15px; font-size: 1.1rem;">
                <option value="grams">grams</option>
                <option value="kilograms">kilograms</option>
                <option value="ml">ml</option>
                <option value="liters">liters</option>
            </select>
            <input id="packCount" type="number" style="width: 350px; padding: 15px; margin-bottom: 20px; font-size: 1.1rem;" placeholder="Number of Packs">
            <button class="btn-use" style="width: 380px; padding: 15px; font-size: 1.2rem;" onclick="addCoffeeIngredient()">Save Ingredient</button>
        </div>`;
}

function addCoffeeIngredient() {
    let name = document.getElementById("name").value.trim();
    let packSize = parseFloat(document.getElementById("packSize").value);
    let baseUnit = document.getElementById("unit").value;
    let packCount = parseFloat(document.getElementById("packCount").value);

    if (!name) return alert("Enter ingredient name");
    if (!packSize || packSize <= 0) return alert("Enter valid pack size");
    if (!packCount || packCount <= 0) return alert("Enter number of packs");

    let totalStock = packSize * packCount;

    let tx = db.transaction(["ingredients"], "readwrite");
    let store = tx.objectStore("ingredients");

    store.add({
        name,
        packSize,
        baseUnit,
        packCount,
        totalStock,
        category: "coffee"
    });

    tx.oncomplete = function () {
        alert("Coffee ingredient added!");
        showDashboard();
    };

    tx.onerror = function (e) {
        alert("Error: " + e.target.error.message);
    };
}

function showAddBreakfast() {
    document.getElementById("mainContent").innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 70vh; font-size: 1.3rem;">
            <h2 style="font-size: 2rem; margin-bottom: 20px;">Add Breakfast Ingredient</h2>
            <select id="type" style="width: 380px; padding: 15px; margin-bottom: 15px; font-size: 1.1rem;">
                <option value="eggs">Eggs (Tray=24)</option>
                <option value="spam">Spam (Can=10)</option>
            </select>
            <input id="packCount" type="number" style="width: 350px; padding: 15px; margin-bottom: 20px; font-size: 1.1rem;" placeholder="Number of Packs">
            <button class="btn-use" style="width: 380px; padding: 15px; font-size: 1.2rem;" onclick="addBreakfastIngredient()">Save Ingredient</button>
        </div>`;
}

function addBreakfastIngredient() {
    let name, packSize, baseUnit;
    let type = document.getElementById("type").value;
    let packCount = parseFloat(document.getElementById("packCount").value);
    if (!packCount) return alert("Enter pack count");

    if (type === "eggs") { name = "Eggs"; packSize = 24; baseUnit = "egg"; }
    else { name = "Spam"; packSize = 10; baseUnit = "slice"; }
    let totalStock = packSize * packCount;
    let tx = db.transaction(["ingredients"], "readwrite");
    tx.objectStore("ingredients").add({ name, packSize, packCount, totalStock, baseUnit, category: "breakfast" });
    tx.oncomplete = showDashboard;
}

// --- PRODUCT MANAGEMENT ---
function showAddProduct() {
   document.getElementById("mainContent").innerHTML = `
  <div style="max-width: 500px; margin: 40px auto; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
    <h2 style="text-align: center; color: #6F4E37; margin-bottom: 30px;">Add New Product</h2>
    
    <form id="addProductForm">
      <label for="pName">Product Name</label>
      <input type="text" id="pName" placeholder="Product Name" required>
      
      <label for="pPrice">Price (₱)</label>
      <input type="number" id="pPrice" placeholder="Price (₱)" step="0.01" min="0" required>

      <label for="pCategory">Product Category</label>
      <select id="pCategory" style="width: 100%; max-width: 450px; padding: 12px 15px; margin-bottom: 18px; border: 1px solid #ccc; border-radius: 8px; font-size: 1rem; box-sizing: border-box; background: #fff;">
          <option value="">Select a Category</option>
          <option value="coffee">Coffee</option>
          <option value="pastries">Pastries</option>
          <option value="breakfast">Breakfast</option>
          <option value="other">Other</option>
      </select>
      
      <label for="pDesc">Product Description</label>
      <textarea id="pDesc" placeholder="Product Description" rows="4"></textarea>
      
      <div class="file-wrapper">
        <label>Product Photo</label>
        <input type="file" id="pImage" accept="image/*">
      </div>

      <h3 style="margin-top: 30px; margin-bottom: 15px; color: #6F4E37;">Recipe Ingredients (e.g., "coffee:10", "Eggs:2")</h3>
      <div id="recipeInputs">
          <input type="text" class="recipe-input" placeholder="Ingredient Name:Amount" style="margin-bottom: 10px;">
      </div>
      <button type="button" class="btn-use" style="width:100%; padding:14px; font-size:1.1rem; margin-top: 10px;" onclick="addRecipeInputField()">
        Add More Ingredients
      </button>

      <button type="button" class="btn-use" style="width:100%; padding:14px; font-size:1.1rem; margin-top: 20px;" onclick="addProduct()">
        Save Product
      </button>
    </form>
  </div>`;
}

function addRecipeInputField() {
    const recipeInputsDiv = document.getElementById("recipeInputs");
    const newInput = document.createElement("input");
    newInput.type = "text";
    newInput.className = "recipe-input";
    newInput.placeholder = "Ingredient Name:Amount";
    newInput.style.marginBottom = "10px";
    recipeInputsDiv.appendChild(newInput);
}

function addProduct() {
    const name = document.getElementById("pName").value;
    const price = parseFloat(document.getElementById("pPrice").value);
    const category = document.getElementById("pCategory").value; // Get the selected category
    const desc = document.getElementById("pDesc").value;
    const fileInput = document.getElementById("pImage");

    if (!name ||!price) {
        alert("Please enter product name and price.");
        return;
    }
    if (!category) { // Ensure a category is selected
        alert("Please select a product category.");
        return;
    }

    const recipe = {};
    const recipeInputs = document.querySelectorAll(".recipe-input");
    let hasInvalidRecipe = false;

    recipeInputs.forEach(input => {
        const value = input.value.trim();
        if (value) {
            const parts = value.split(':');
            if (parts.length === 2) {
                const ingName = parts[0].trim().toLowerCase();
                const amount = parseFloat(parts[1].trim());
                if (ingName &&!isNaN(amount) && amount > 0) {
                    recipe[ingName] = (recipe[ingName] || 0) + amount;
                } else {
                    alert(`Invalid recipe format for '${value}'. Please use 'Ingredient:Amount' (e.g., 'Coffee:10') with a valid positive amount.`);
                    hasInvalidRecipe = true;
                }
            } else {
                alert(`Invalid recipe format for '${value}'. Please use 'Ingredient:Amount' (e.g., 'Coffee:10').`);
                hasInvalidRecipe = true;
            }
        }
    });

    if (hasInvalidRecipe) {
        return;
    }

    if (fileInput.files && fileInput.files[0]) {
        let reader = new FileReader();
        reader.onload = function(e) {
            saveProductToDB(name, price, category, desc, e.target.result, recipe); // Pass category
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        saveProductToDB(name, price, category, desc, "https://via.placeholder.com/150", recipe); // Pass category
    }
}

function saveProductToDB(name, price, category, description, imageData, recipe) { // Added category parameter
    let tx = db.transaction(["products"], "readwrite");
    let store = tx.objectStore("products");
    
    // Add the new product with its recipe AND category
    store.add({ name, price, category, description, image: imageData, recipe: recipe }) // Save category
    .onsuccess = function() {
            alert("Product saved successfully!");
            showProductList();
        };

    tx.onerror = function(e) {
        alert("Error saving product: " + e.target.error.message);
    };
}

// --- MENU & POS SYSTEM ---
// Modified showProductList to include category buttons
function showProductList() {
    document.getElementById("mainContent").innerHTML = `
        <h2>Menu</h2>
        <div class="category-buttons" style="margin-bottom: 20px; text-align: center;">
            <button class="btn-category active" onclick="loadProducts('all')">All</button>
            <button class="btn-category" onclick="loadProducts('coffee')">Coffee</button>
            <button class="btn-category" onclick="loadProducts('pastries')">Pastries</button>
            <button class="btn-category" onclick="loadProducts('breakfast')">Breakfast</button>
            <button class="btn-category" onclick="loadProducts('other')">Other</button>
        </div>
        <div id="productContainer" class="product-grid"></div>
        <div class="cart-panel">
            <h3>Current Order</h3>
            <input type="text" id="custName" placeholder="Customer Name" style="padding:8px; width:200px; margin-bottom:10px;">
            <div id="cartContainer"></div>
            <div style="text-align:right; margin-top:20px; border-top: 1px solid #ddd; padding-top: 15px;">
                <h3 style="margin: 5px 0;">Total: ₱<span id="total">0</span></h3>
                <div style="margin: 10px 0;">
                    <label>Cash Received: ₱</label>
                    <input type="number" id="cashReceived" oninput="calculateChange()" style="padding:8px; width:100px; font-weight:bold;">
                </div>
                <h3 style="color: #2e7d32; margin: 5px 0;">Change: ₱<span id="changeAmount">0.00</span></h3>
                <div style="margin-top: 15px;">
                    <button class="btn-use" style="padding:10px 20px" onclick="checkout()">Checkout & Print</button>
                    <button class="btn-del" style="padding:10px 20px" onclick="clearCart()">Cancel Order</button>
                </div>
            </div>
        </div>`;
    loadProducts('all'); // Load all products by default
}

// Modified loadProducts to filter by category
function loadProducts(category = 'all') { // Added category parameter
    let tx = db.transaction(["products"], "readonly");
    let request = tx.objectStore("products").getAll();
    request.onsuccess = function () {
        let container = document.getElementById("productContainer");
        container.innerHTML = "";
        const allProducts = request.result;

        // Filter products based on selected category
        const filteredProducts = allProducts.filter(p => 
            category === 'all' || p.category === category
        );

        filteredProducts.forEach(p => {
            container.innerHTML += `
    <div class="product-card">
        <img src="${p.image || 'https://via.placeholder.com/150'}">
        <div class="content">
            <strong>${p.name}</strong><br>
            <small>${p.description || ""}</small><br>
            <strong style="color: #6F4E37; font-size:1.3rem;">₱${p.price}</strong>
        </div>
        <div class="button-group">
            <input type="number" id="qty-${p.id}" value="1" min="1">
            <button class="btn-use" onclick="prepareAddToCart(${p.id}, '${p.name.replace(/'/g, "\\'")}', ${p.price})">
                Add to Order
            </button>
            <button class="btn-del" onclick="deleteProduct(${p.id})">Delete</button>
        </div>
    </div>`;
        });

        // Update active class for category buttons
        document.querySelectorAll('.btn-category').forEach(button => {
            button.classList.remove('active');
            if (button.onclick.toString().includes(`'${category}'`)) {
                button.classList.add('active');
            }
        });
    };
}

function calculateChange() {
    let total = parseFloat(document.getElementById("total").innerText) || 0;
    let cash = parseFloat(document.getElementById("cashReceived").value) || 0;
    let change = cash - total;
    document.getElementById("changeAmount").innerText = change >= 0? change.toFixed(2) : "0.00";
}

function prepareAddToCart(id, name, price) {
    let qtyInput = document.getElementById(`qty-${id}`);
    let amount = parseInt(qtyInput.value);
    if (amount <= 0 || isNaN(amount)) return alert("Enter valid quantity");
    addToCart(id, name, price, amount);
    qtyInput.value = 1;
}

function addToCart(id, name, price, quantity) {
    let existing = cart.find(item => item.id === id);
    if (existing) existing.qty += quantity;
    else cart.push({ id, name, price, qty: quantity });
    renderCart();
}

function renderCart() {
    let container = document.getElementById("cartContainer");
    let total = 0;
    container.innerHTML = "";
    cart.forEach(item => {
        let subtotal = item.price * item.qty;
        total += subtotal;
        container.innerHTML += `
            <div class="cart-item">
                <span>${item.name} x${item.qty}</span>
                <span>₱${subtotal.toFixed(2)} <button class="btn-del" onclick="removeItem(${item.id})">x</button></span>
            </div>`;
    });
    document.getElementById("total").innerText = total.toFixed(2);
    calculateChange();
}

function removeItem(id) {
    cart = cart.filter(item => item.id!== id);
    renderCart();
}

function clearCart() {
    cart = [];
    renderCart();
}

function deleteProduct(id) {
    if (confirm("Delete this product?")) {
        let tx = db.transaction(["products"], "readwrite");
        tx.objectStore("products").delete(id);
        tx.oncomplete = showProductList; // Reload the product list after deletion
    }
}

// --- CHECKOUT & RECEIPT ---
function checkout() {
    // Check if the cart is empty
    if (cart.length === 0) {
        alert("Your cart is empty. Please add items before checking out.");
        return;
    }

    const customer = document.getElementById("custName").value || "Walk-in";
    const total = parseFloat(document.getElementById("total").innerText);
    const cashReceivedInput = document.getElementById("cashReceived");
    const cash = parseFloat(cashReceivedInput.value) || 0;

    if (cash < total) {
        alert(`Insufficient cash! Customer needs to pay ₱${(total - cash).toFixed(2)} more.`);
        cashReceivedInput.focus();
        return;
    }

    // Use a transaction that covers all necessary stores
    const tx = db.transaction(["sales", "ingredients", "products"], "readwrite"); 
    const salesStore = tx.objectStore("sales");
    const ingStore = tx.objectStore("ingredients");
    const productStore = tx.objectStore("products");

    // Prepare sale data
    const saleData = {
        customer: customer,
        items: JSON.parse(JSON.stringify(cart)), // Deep copy cart items for the sale record
        total: total,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date()
    };

    // 1. Add the sale record
    const addSaleRequest = salesStore.add(saleData);

    addSaleRequest.onsuccess = function (event) {
        console.log("Sale saved successfully! ID:", event.target.result);

        // 2. Process ingredient deductions for each item in the cart
        const deductionPromises = cart.map(cartItem => {
            return new Promise((resolve, reject) => {
                const getProductRequest = productStore.get(cartItem.id);

                getProductRequest.onsuccess = function (event) {
                    const product = event.target.result;

                    if (!product ||!product.recipe || Object.keys(product.recipe).length === 0) {
                        console.warn(`Product '${cartItem.name}' (ID: ${cartItem.id}) has no defined recipe for deductions.`);
                        return resolve(); // No recipe, no deduction needed for this item
                    }

                    const recipe = product.recipe;
                    const ingredientDeductionPromises = Object.entries(recipe).map(([ingName, amountPerUnit]) => {
                        return new Promise((ingResolve, ingReject) => {
                            const getIngredientRequest = ingStore.openCursor(); // Use cursor to find by name

                            getIngredientRequest.onsuccess = function (event) {
                                const cursor = event.target.result;
                                if (cursor) {
                                    if (cursor.value.name.toLowerCase() === ingName) {
                                        let ingredient = cursor.value;
                                        const totalAmountToDeduct = amountPerUnit * cartItem.qty;

                                        if (ingredient.totalStock < totalAmountToDeduct) {
                                            alert(`Not enough '${ingredient.name}' for '${cartItem.name}'! Required: ${totalAmountToDeduct} ${ingredient.baseUnit || 'units'}, Available: ${ingredient.totalStock} ${ingredient.baseUnit || 'units'}.`);
                                            // You might want to stop the checkout or mark this item as problematic
                                            return ingReject(new Error(`Insufficient stock for ${ingredient.name}`));
                                        }

                                        ingredient.totalStock -= totalAmountToDeduct;
                                        cursor.update(ingredient).onsuccess = ingResolve;
                                        cursor.update(ingredient).onerror = ingReject;
                                    } else {
                                        cursor.continue(); // Move to the next ingredient
                                    }
                                } else {
                                    // Ingredient not found in inventory
                                    console.warn(`Ingredient '${ingName}' not found in inventory for product '${cartItem.name}'.`);
                                    ingResolve(); // Resolve, but log a warning
                                }
                            };
                            getIngredientRequest.onerror = ingReject;
                        });
                    });

                    Promise.all(ingredientDeductionPromises)
                    .then(resolve)
                    .catch(reject); // Propagate rejection if any ingredient deduction fails
                };
                getProductRequest.onerror = reject; // Propagate product retrieval error
            });
        });

        // 3. After all deductions are attempted, print receipt or handle errors
        Promise.all(deductionPromises)
        .then(() => {
                tx.oncomplete = () => { // Only print receipt if the whole transaction completes
                    printReceipt(customer, cash, total);
                };
                tx.onerror = (e) => { // If the transaction fails during deductions
                    console.error("Transaction failed during deductions:", e.target.error);
                    alert("An error occurred during stock deduction. Sale was saved, but inventory might be inaccurate. Please check console.");
                };
            })
        .catch(error => {
                // If any promise in deductionPromises rejected, this catch block runs.
                // The transaction will automatically abort if an error occurred in one of the sub-requests.
                console.error("Checkout process aborted due to an error:", error);
                alert(`Checkout failed: ${error.message}. Please check inventory and try again.`);
                tx.abort(); // Explicitly abort if not already
            });

    };

    addSaleRequest.onerror = function (event) {
        console.error("Error saving sale:", event.target.error);
        alert("Failed to save sale: " + event.target.error.message);
    };
}

function printReceipt(customer, cash, total) {
    const change = (cash - total).toFixed(2);
    const now = new Date();
    const receiptHTML = `
        <div style="font-family:monospace; width: 280px; padding: 10px;">
            <center><h2 style="margin:0;">${SHOP_NAME}</h2><p>${now.toLocaleString()}</p></center>
            <hr><p>CUSTOMER: ${customer.toUpperCase()}</p>
            <table style="width:100%;">${cart.map(i => `<tr><td>${i.qty}x ${i.name}</td><td style="text-align:right;">₱${(i.price*i.qty).toFixed(2)}</td></tr>`).join('')}</table>
            <hr><p>TOTAL: <span style="float:right;">₱${total.toFixed(2)}</span></p>
            <p>CASH: <span style="float:right;">₱${cash.toFixed(2)}</span></p>
            <p>CHANGE: <span style="float:right; font-weight:bold;">₱${change}</span></p>
            <center><p style="margin-top:20px;">Thank you!</p></center>
        </div>`;

    const printWin = window.open('', '_blank', 'width=400,height=600');
    if (!printWin) return alert("Allow pop-ups to print receipts!");

    printWin.document.write('<html><body>' + receiptHTML + '</body></html>');
    printWin.document.close();
    setTimeout(() => { printWin.print(); printWin.close(); }, 500);

    cart = [];
    renderCart();
    document.getElementById("custName").value = "";
    document.getElementById("cashReceived").value = "";
}

// --- REPORTS (SURGICAL UPDATE FOR LOGIC) ---
function showReports() {
    document.getElementById("mainContent").innerHTML = `
        <h2>Reports</h2>
        <div class="card" style="background: #eee; padding:15px;">
            From: <input type="date" id="dateFrom"> To: <input type="date" id="dateTo">
            <button class="btn-use" onclick="generateReport('income')">Income Report</button>
            <button class="btn-use" style="background:#8d6e63" onclick="generateReport('usage')">Usage Report</button>
        </div>
        <div id="reportResult" style="margin-top:20px; background:white; padding:20px;"></div>`;
}

function generateReport(type) {
    let from = document.getElementById("dateFrom").value;
    let to = document.getElementById("dateTo").value;

    console.log("Report requested:", { type, from, to });

    if (!from ||!to) {
        alert("Select date range");
        return;
    }

    let tx = db.transaction(["sales"], "readonly");
    let request = tx.objectStore("sales").getAll();

    request.onsuccess = function () {
        let allSales = request.result;
        console.log("All sales in DB:", allSales);

        let filtered = allSales.filter(s => {
            let saleDate = s.date;
            console.log("Checking sale date:", saleDate, "against", from, "to", to);
            let saleDateObj = new Date(saleDate);
            let fromObj = new Date(from);
            let toObj = new Date(to);
            return saleDateObj >= fromObj && saleDateObj <= toObj;
        });

        console.log("Filtered sales for report:", filtered);

        if (filtered.length === 0) {
            document.getElementById("reportResult").innerHTML = `
                <p>No sales found in this date range.</p>
                <p>Debug info: ${allSales.length} total sales in DB. Check console for details.</p>`;
            return;
        }

        if (type === 'income') {
            renderIncomeReport(filtered, from, to);
        } else if (type === 'usage') {
            renderUsageReport(filtered, from, to);
        }
    };

    request.onerror = function (e) {
        console.error("Error reading sales:", e.target.error);
        alert("Error loading sales: " + e.target.error.message);
    };
}

function renderIncomeReport(data, from, to) {
    let grandTotal = 0;
    let html = `
        <div id="reportToExport">
            <h2 style="text-align:center;">Detailed Income Report</h2>
            <p style="text-align:center;">${from} to ${to}</p>
            <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background:#f2f2f2;">
                        <th style="border:1px solid #ddd; padding:8px;">Date</th>
                        <th style="border:1px solid #ddd; padding:8px;">Customer</th>
                        <th style="border:1px solid #ddd; padding:8px;">Items Ordered</th>
                        <th style="border:1px solid #ddd; padding:8px; text-align:right;">Total</th>
                    </tr>
                </thead>
                <tbody>`;

    data.forEach(sale => {
        grandTotal += sale.total;
        let itemsList = sale.items.map(i => `${i.qty} × ${i.name} (₱${(i.price * i.qty).toFixed(2)})`).join('<br>');

        html += `
            <tr>
                <td style="border:1px solid #ddd; padding:8px;">${sale.date}</td>
                <td style="border:1px solid #ddd; padding:8px;">${sale.customer}</td>
                <td style="border:1px solid #ddd; padding:8px;">${itemsList}</td>
                <td style="border:1px solid #ddd; padding:8px; text-align:right;">₱${sale.total.toFixed(2)}</td>
            </tr>`;
    });

    html += `
                </tbody>
                <tfoot>
                    <tr style="font-weight:bold; background:#eee;">
                        <td colspan="3" style="text-align:right; padding:8px;">GRAND TOTAL:</td>
                        <td style="text-align:right; padding:8px;">₱${grandTotal.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <br>
        <button class="btn-use" onclick="saveReportAsPDF('${from}_Income')">Save Report as PDF</button>`;

    document.getElementById("reportResult").innerHTML = html;
}

function renderUsageReport(salesData, from, to) {
    let usageSummary = {};

    // Need to get all ingredients and products first for lookup
    const tx = db.transaction(["ingredients", "products", "usages"], "readonly");
    const ingredientStore = tx.objectStore("ingredients");
    const productStore = tx.objectStore("products");
    const usageStore = tx.objectStore("usages");

    let allIngredients = [];
    ingredientStore.getAll().onsuccess = function(event) {
        allIngredients = event.target.result;
    };

    let allProducts = [];
    productStore.getAll().onsuccess = function(event) {
        allProducts = event.target.result;

        // Aggregate from sales (using embedded product recipes)
        salesData.forEach(sale => {
            sale.items.forEach(cartItem => {
                const product = allProducts.find(p => p.id === cartItem.id);

                if (product && product.recipe && Object.keys(product.recipe).length > 0) {
                    Object.entries(product.recipe).forEach(([ingName, amountPerUnit]) => {
                        const totalAmountUsed = amountPerUnit * cartItem.qty;
                        usageSummary[ingName] = (usageSummary[ingName] || 0) + totalAmountUsed;
                    });
                } else {
                    console.warn(`Product '${cartItem.name}' (ID: ${cartItem.id}) in sale has no recipe or product data found for usage report.`);
                }
            });
        });

        // Aggregate from manual usages
        const usageRequest = usageStore.getAll();
        usageRequest.onsuccess = function() {
            const allUsages = usageRequest.result;
            const filteredUsages = allUsages.filter(u => {
                const usageDate = new Date(u.date);
                const fromDate = new Date(from);
                const toDate = new Date(to);
                // Ensure the usage date is within the selected range (inclusive)
                return usageDate >= fromDate && usageDate <= toDate;
            });

            filteredUsages.forEach(usage => {
                const ing = usage.ingredient.toLowerCase();
                usageSummary[ing] = (usageSummary[ing] || 0) + usage.amount;
            });

            // Now build the HTML report
            if (Object.keys(usageSummary).length === 0) {
                document.getElementById("reportResult").innerHTML = "<p>No ingredient usage detected in this period.</p>";
                return;
            }

            let html = `
                <div id="reportToExport">
                    <h2 style="text-align:center;">Stock Usage Summary</h2>
                    <p style="text-align:center;">${from} to ${to}</p>
                    <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
                        <thead>
                            <tr style="background:#f2f2f2;">
                                <th>Ingredient</th>
                                <th style="text-align:right;">Amount Used</th>
                            </tr>
                        </thead>
                        <tbody>`;

            for (const ingName in usageSummary) {
                const ingredientData = allIngredients.find(i => i.name.toLowerCase() === ingName);
                const unit = ingredientData? ingredientData.baseUnit : "units"; // Use the actual unit from inventory

                html += `
                    <tr>
                        <td style="border:1px solid #ddd; padding:8px;">${ingName.toUpperCase()}</td>
                        <td style="border:1px solid #ddd; padding:8px; text-align:right;">${usageSummary[ingName]} ${unit}</td>
                    </tr>`;
            }

            html += `
                        </tbody>
                    </table>
                </div>
                <br>
                <button class="btn-use" onclick="saveReportAsPDF('${from}_Usage')">Save Usage as PDF</button>`;

            document.getElementById("reportResult").innerHTML = html;
        };
        usageRequest.onerror = function(e) {
            console.error("Error reading manual usages for report:", e.target.error);
            alert("Error loading manual usages for report: " + e.target.error.message);
        };
    };

    tx.onerror = function(e) {
        console.error("Transaction failed during report generation:", e.target.error);
        alert("Error generating report: " + e.target.error.message);
    };
}

function saveReportAsPDF(fileName) {
    const reportContent = document.getElementById("reportToExport").innerHTML;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return alert("Allow pop-ups to print reports!");

    printWindow.document.write(`
        <html>
            <head>
                <title>${fileName}</title>
                <style>
                    body { font-family: Arial; padding: 40px; }
                    table { width:100%; border-collapse: collapse; }
                    th, td { border:1px solid #ddd; padding:12px; text-align:left; }
                    th { background:#f2f2f2; }
                </style>
            </head>
            <body>
                <h1 style="text-align:center;">${SHOP_NAME}</h1>
                ${reportContent}
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() { window.close(); };
                    };
                </script>
            </body>
        </html>`);
    printWindow.document.close();
}

function toggleFullscreen() {
    let elem = document.documentElement;
    if (!document.fullscreenElement) {
        if (elem.requestFullscreen) elem.requestFullscreen();
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    } else {
        if (document.exitFullscreen) elem.exitFullscreen();
    }
}
// Menu toggle logic. Don't touch.
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');

  function toggleMenu() {
    const isOpen = sidebar.classList.toggle('open');
    overlay.classList.toggle('active', isOpen);
    menuToggle.classList.toggle('active', isOpen); // optional: change button color when open
  }

  menuToggle.addEventListener('click', toggleMenu);
  overlay.addEventListener('click', toggleMenu);

  // Menu sidebar logic
  const navButtons = sidebar.querySelectorAll('button');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setTimeout(toggleMenu, 150); 
    });
  });
});