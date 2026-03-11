let db;
let cart = [];
const SHOP_NAME = "COFFEE STOCK APP";

let request = indexedDB.open("CoffeeStockDB", 12);

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
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <input type="number" style="width:80px; padding: 8px; font-size: 1rem;" id="use-${item.id}" placeholder="${item.baseUnit}">
                        <button class="btn-use" style="padding: 8px 15px;" onclick="useStock(${item.id})">Use</button>
                        <button class="btn-use" style="padding: 8px 15px; background:#2e7d32;" onclick="restockIngredient(${item.id})">Restock</button>
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

// --- NEW: RESTOCK INGREDIENT ---
function restockIngredient(id) {
    let amount = prompt("Enter quantity to restock:");
    amount = parseFloat(amount);

    if (!amount || amount <= 0) {
        return alert("Enter a valid restock quantity.");
    }

    let tx = db.transaction(["ingredients"], "readwrite");
    let store = tx.objectStore("ingredients");
    let request = store.get(id);

    request.onsuccess = function () {
        let item = request.result;
        item.totalStock += amount;

        if (item.packSize && item.packSize > 0) {
            item.packCount = item.totalStock / item.packSize;
        }

        store.put(item);
    };

    tx.oncomplete = function () {
        alert("Ingredient restocked successfully!");
        loadIngredients();
    };

    tx.onerror = function (e) {
        alert("Error restocking ingredient: " + e.target.error.message);
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
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 70vh; font-size: 1.3rem;">
            <h2 style="font-size: 2rem; margin-bottom: 20px;">Add Breakfast Ingredient</h2>

            <select id="type" onchange="toggleBreakfastFields()" style="width: 380px; padding: 15px; margin-bottom: 15px; font-size: 1.1rem;">
                <option value="eggs">Eggs (Tray=24)</option>
                <option value="spam">Spam (Can=10)</option>
                <option value="manual">Manual Ingredient</option>
            </select>

            <div id="presetFields" style="display: block; width: 100%; text-align: center;">
                <input id="packCount" type="number" style="width: 350px; padding: 15px; margin-bottom: 20px; font-size: 1.1rem;" placeholder="Number of Packs">
            </div>

            <div id="manualFields" style="display: none; width: 100%; text-align: center;">
                <input id="manualName" type="text" style="width: 350px; padding: 15px; margin-bottom: 15px; font-size: 1.1rem;" placeholder="Ingredient Name">
                <input id="manualPcs" type="number" style="width: 350px; padding: 15px; margin-bottom: 15px; font-size: 1.1rem;" placeholder="PCS">
                <input id="manualPacks" type="number" style="width: 350px; padding: 15px; margin-bottom: 20px; font-size: 1.1rem;" placeholder="Packs">
            </div>

            <button class="btn-use" style="width: 380px; padding: 15px; font-size: 1.2rem;" onclick="addBreakfastIngredient()">Save Ingredient</button>
        </div>`;
}

function toggleBreakfastFields() {
    let type = document.getElementById("type").value;
    let presetFields = document.getElementById("presetFields");
    let manualFields = document.getElementById("manualFields");

    if (type === "manual") {
        presetFields.style.display = "none";
        manualFields.style.display = "block";
    } else {
        presetFields.style.display = "block";
        manualFields.style.display = "none";
    }
}

function addBreakfastIngredient() {
    let name, packSize, baseUnit, packCount;
    let type = document.getElementById("type").value;

    if (type === "eggs") {
        packCount = parseFloat(document.getElementById("packCount").value);
        if (!packCount || packCount <= 0) return alert("Enter pack count");
        name = "Eggs";
        packSize = 24;
        baseUnit = "egg";
    }
    else if (type === "spam") {
        packCount = parseFloat(document.getElementById("packCount").value);
        if (!packCount || packCount <= 0) return alert("Enter pack count");
        name = "Spam";
        packSize = 10;
        baseUnit = "slice";
    }
    else if (type === "manual") {
        name = document.getElementById("manualName").value.trim();
        let pcs = parseFloat(document.getElementById("manualPcs").value);
        let packs = parseFloat(document.getElementById("manualPacks").value);

        if (!name) return alert("Enter ingredient name");
        if (!pcs || pcs <= 0) return alert("Enter valid PCS");
        if (!packs || packs <= 0) return alert("Enter valid packs");

        packSize = pcs;
        packCount = packs;
        baseUnit = "pcs";
    }

    let totalStock = packSize * packCount;
    let tx = db.transaction(["ingredients"], "readwrite");
    tx.objectStore("ingredients").add({ name, packSize, packCount, totalStock, baseUnit, category: "breakfast" });

    tx.oncomplete = function () {
        alert("Breakfast ingredient added!");
        showDashboard();
    };

    tx.onerror = function (e) {
        alert("Error: " + e.target.error.message);
    };
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
    const category = document.getElementById("pCategory").value;
    const desc = document.getElementById("pDesc").value;
    const fileInput = document.getElementById("pImage");

    if (!name || !price) {
        alert("Please enter product name and price.");
        return;
    }
    if (!category) {
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
                if (ingName && !isNaN(amount) && amount > 0) {
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
            saveProductToDB(name, price, category, desc, e.target.result, recipe);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        saveProductToDB(name, price, category, desc, "https://via.placeholder.com/150", recipe);
    }
}

function saveProductToDB(name, price, category, description, imageData, recipe) {
    let tx = db.transaction(["products"], "readwrite");
    let store = tx.objectStore("products");
    
    store.add({ name, price, category, description, image: imageData, recipe: recipe })
    .onsuccess = function() {
        alert("Product saved successfully!");
        showProductList();
    };

    tx.onerror = function(e) {
        alert("Error saving product: " + e.target.error.message);
    };
}

// --- MENU & POS SYSTEM ---
function showProductList() {
    document.getElementById("mainContent").innerHTML = `
        <h2>Menu</h2>
        <div style="text-align:center; margin-bottom: 15px;">
            <input 
                type="text" 
                id="productSearch" 
                placeholder="Search products..." 
                oninput="filterProducts()"
                style="width: 300px; max-width: 90%; padding: 10px; font-size: 1rem; border: 1px solid #ccc; border-radius: 8px;"
            >
        </div>
        <div class="category-buttons" style="margin-bottom: 20px; text-align: center;">
            <button class="btn-category active" data-category="all" onclick="loadProducts('all')">All</button>
            <button class="btn-category" data-category="coffee" onclick="loadProducts('coffee')">Coffee</button>
            <button class="btn-category" data-category="pastries" onclick="loadProducts('pastries')">Pastries</button>
            <button class="btn-category" data-category="breakfast" onclick="loadProducts('breakfast')">Breakfast</button>
            <button class="btn-category" data-category="other" onclick="loadProducts('other')">Other</button>
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
    loadProducts('all');
}

function filterProducts() {
    const activeButton = document.querySelector('.btn-category.active');
    const category = activeButton ? activeButton.getAttribute('data-category') : 'all';
    loadProducts(category);
}

function loadProducts(category = 'all') {
    let tx = db.transaction(["products"], "readonly");
    let request = tx.objectStore("products").getAll();
    request.onsuccess = function () {
        let container = document.getElementById("productContainer");
        container.innerHTML = "";
        const allProducts = request.result;
        const searchValue = (document.getElementById("productSearch")?.value || "").toLowerCase().trim();

        const filteredProducts = allProducts.filter(p => {
            const matchesCategory = category === 'all' || p.category === category;
            const matchesSearch =
                !searchValue ||
                p.name.toLowerCase().includes(searchValue) ||
                (p.description || "").toLowerCase().includes(searchValue);
            return matchesCategory && matchesSearch;
        });

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

        document.querySelectorAll('.btn-category').forEach(button => {
            button.classList.remove('active');
            if (button.getAttribute('data-category') === category) {
                button.classList.add('active');
            }
        });

        if (filteredProducts.length === 0) {
            container.innerHTML = `<p style="text-align:center; width:100%;">No products found.</p>`;
        }
    };
}

function calculateChange() {
    let total = parseFloat(document.getElementById("total").innerText) || 0;
    let cash = parseFloat(document.getElementById("cashReceived").value) || 0;
    let change = cash - total;
    document.getElementById("changeAmount").innerText = change >= 0 ? change.toFixed(2) : "0.00";
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
    cart = cart.filter(item => item.id !== id);
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
        tx.oncomplete = showProductList;
    }
}

// --- CHECKOUT & RECEIPT ---
function checkout() {
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

    const tx = db.transaction(["sales", "ingredients", "products"], "readwrite");
    const salesStore = tx.objectStore("sales");
    const ingStore = tx.objectStore("ingredients");
    const productStore = tx.objectStore("products");

    const saleData = {
        customer: customer,
        items: JSON.parse(JSON.stringify(cart)),
        total: total,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date()
    };

    const addSaleRequest = salesStore.add(saleData);

    addSaleRequest.onsuccess = function (event) {
        console.log("Sale saved successfully! ID:", event.target.result);

        const deductionPromises = cart.map(cartItem => {
            return new Promise((resolve, reject) => {
                const getProductRequest = productStore.get(cartItem.id);

                getProductRequest.onsuccess = function (event) {
                    const product = event.target.result;

                    if (!product || !product.recipe || Object.keys(product.recipe).length === 0) {
                        console.warn(`Product '${cartItem.name}' (ID: ${cartItem.id}) has no defined recipe for deductions.`);
                        return resolve();
                    }

                    const recipe = product.recipe;
                    const ingredientDeductionPromises = Object.entries(recipe).map(([ingName, amountPerUnit]) => {
                        return new Promise((ingResolve, ingReject) => {
                            const getIngredientRequest = ingStore.openCursor();

                            getIngredientRequest.onsuccess = function (event) {
                                const cursor = event.target.result;
                                if (cursor) {
                                    if (cursor.value.name.toLowerCase() === ingName) {
                                        let ingredient = cursor.value;
                                        const totalAmountToDeduct = amountPerUnit * cartItem.qty;

                                        if (ingredient.totalStock < totalAmountToDeduct) {
                                            alert(`Not enough '${ingredient.name}' for '${cartItem.name}'! Required: ${totalAmountToDeduct} ${ingredient.baseUnit || 'units'}, Available: ${ingredient.totalStock} ${ingredient.baseUnit || 'units'}.`);
                                            return ingReject(new Error(`Insufficient stock for ${ingredient.name}`));
                                        }

                                        ingredient.totalStock -= totalAmountToDeduct;
                                        const updateRequest = cursor.update(ingredient);
                                        updateRequest.onsuccess = ingResolve;
                                        updateRequest.onerror = ingReject;
                                    } else {
                                        cursor.continue();
                                    }
                                } else {
                                    console.warn(`Ingredient '${ingName}' not found in inventory for product '${cartItem.name}'.`);
                                    ingResolve();
                                }
                            };
                            getIngredientRequest.onerror = ingReject;
                        });
                    });

                    Promise.all(ingredientDeductionPromises)
                        .then(resolve)
                        .catch(reject);
                };
                getProductRequest.onerror = reject;
            });
        });

        Promise.all(deductionPromises)
        .then(() => {
            tx.oncomplete = () => {
                printReceipt(customer, cash, total);
            };
            tx.onerror = (e) => {
                console.error("Transaction failed during deductions:", e.target.error);
                alert("An error occurred during stock deduction. Sale was saved, but inventory might be inaccurate. Please check console.");
            };
        })
        .catch(error => {
            console.error("Checkout process aborted due to an error:", error);
            alert(`Checkout failed: ${error.message}. Please check inventory and try again.`);
            tx.abort();
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

// --- REPORTS ---
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

// --- NEW: ROBUST DATE PARSER ---
function parseReportDate(dateStr, isEndOfDay = false) {
    if (!dateStr) return null;

    let year, month, day;

    if (dateStr.includes("-")) {
        const parts = dateStr.split("-");
        if (parts[0].length === 4) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
        } else {
            month = parseInt(parts[0], 10) - 1;
            day = parseInt(parts[1], 10);
            year = parseInt(parts[2], 10);
        }
    } else if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        month = parseInt(parts[0], 10) - 1;
        day = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
    } else {
        return null;
    }

    if (isEndOfDay) {
        return new Date(year, month, day, 23, 59, 59, 999);
    }
    return new Date(year, month, day, 0, 0, 0, 0);
}

function generateReport(type) {
    let from = document.getElementById("dateFrom").value;
    let to = document.getElementById("dateTo").value;

    if (!from || !to) {
        alert("Select date range");
        return;
    }

    const fromDate = parseReportDate(from, false);
    const toDate = parseReportDate(to, true);

    if (!fromDate || !toDate) {
        alert("Invalid date format.");
        return;
    }

    let tx = db.transaction(["sales"], "readonly");
    let request = tx.objectStore("sales").getAll();

    request.onsuccess = function () {
        let allSales = request.result;

        let filtered = allSales.filter(s => {
            let saleDateObj = parseReportDate(s.date, false);
            return saleDateObj && saleDateObj >= fromDate && saleDateObj <= toDate;
        });

        if (filtered.length === 0) {
            document.getElementById("reportResult").innerHTML = `
                <p>No sales found in this date range.</p>
                <p>Debug info: ${allSales.length} total sales in DB.</p>`;
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

    const tx = db.transaction(["ingredients", "products", "usages"], "readonly");
    const ingredientStore = tx.objectStore("ingredients");
    const productStore = tx.objectStore("products");
    const usageStore = tx.objectStore("usages");

    const fromDate = parseReportDate(from, false);
    const toDate = parseReportDate(to, true);

    let allIngredients = [];
    ingredientStore.getAll().onsuccess = function(event) {
        allIngredients = event.target.result;
    };

    let allProducts = [];
    productStore.getAll().onsuccess = function(event) {
        allProducts = event.target.result;

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

        const usageRequest = usageStore.getAll();
        usageRequest.onsuccess = function() {
            const allUsages = usageRequest.result;
            const filteredUsages = allUsages.filter(u => {
                const usageDate = parseReportDate(u.date, false);
                return usageDate && usageDate >= fromDate && usageDate <= toDate;
            });

            filteredUsages.forEach(usage => {
                const ing = usage.ingredient.toLowerCase();
                usageSummary[ing] = (usageSummary[ing] || 0) + usage.amount;
            });

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
                const unit = ingredientData ? ingredientData.baseUnit : "units";

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
        if (document.exitFullscreen) document.exitFullscreen();
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
    menuToggle.classList.toggle('active', isOpen);
  }

  menuToggle.addEventListener('click', toggleMenu);
  overlay.addEventListener('click', toggleMenu);

  const navButtons = sidebar.querySelectorAll('button');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setTimeout(toggleMenu, 150); 
    });
  });
});
