// ============================================================
// FURONIX E-COMMERCE BACKEND
// Google Apps Script + Google Sheets + Google Drive
// Case Study: Furonix E-Commerce Website
// ============================================================
//
// IMPORTANT:
// 1. Is poore code ko Code.gs mein paste karein.
// 2. setupSheets() sirf FIRST TIME run karein.
// 3. setupSheets() dobara run karne se existing sheet data clear ho jayega.
// 4. Default admin:
//       Username: admin
//       Password: admin123
// 5. First login ke baad password change karna recommended hai.
// 6. Deployment:
//       Execute as: Me
//       Who has access: Anyone
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    throw new Error("Sheet not found: " + name);
  }

  return sheet;
}


// ============================================================
// SECRET KEY
// ============================================================

function getSecret() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty("SECRET_KEY");

  if (!secret) {
    secret = Utilities.getUuid();
    props.setProperty("SECRET_KEY", secret);
  }

  return secret;
}


// ============================================================
// ADMIN SALT
// ============================================================

function getSalt() {
  var props = PropertiesService.getScriptProperties();
  var salt = props.getProperty("ADMIN_SALT");

  if (!salt) {
    salt = Utilities.getUuid();
    props.setProperty("ADMIN_SALT", salt);
  }

  return salt;
}


// ============================================================
// JSON RESPONSE HELPERS
// ============================================================

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


function ok(message, data) {
  return jsonOut({
    success: true,
    message: message || "OK",
    data: data || {}
  });
}


function fail(message) {
  return jsonOut({
    success: false,
    message: message || "Something went wrong"
  });
}


// ============================================================
// GET REQUEST
// ============================================================

function doGet(e) {
  try {

    var params = e && e.parameter ? e.parameter : {};
    var action = params.action || "";

    switch (action) {

      case "getProducts":
        return ok(
          "Products fetched",
          getProducts(params)
        );


      case "getProduct":
        return getProduct(params.productId);


      case "getCategories":
        return ok(
          "Categories fetched",
          getCategories()
        );


      case "getSettings":
        return ok(
          "Settings fetched",
          getSettings()
        );


      case "getOrders":
        return withAdmin(
          params,
          function () {
            return ok(
              "Orders fetched",
              getOrders(params)
            );
          }
        );


      case "getOrder":
        return withAdmin(
          params,
          function () {
            return getOrder(params.orderId);
          }
        );


      case "getDashboardStats":
        return withAdmin(
          params,
          function () {
            return ok(
              "Stats fetched",
              getDashboardStats()
            );
          }
        );


      default:
        return fail("Unknown action");

    }

  } catch (err) {

    return fail(
      "Server error: " + err.message
    );

  }
}


// ============================================================
// POST REQUEST
// ============================================================

function doPost(e) {
  try {

    var body = {};

    if (
      e &&
      e.postData &&
      e.postData.contents
    ) {
      body = JSON.parse(
        e.postData.contents
      );
    }

    var action = body.action || "";

    switch (action) {

      case "adminLogin":
        return adminLogin(body);


      case "createOrder":
        return createOrder(body);


      case "addProduct":
        return withAdmin(
          body,
          function () {
            return addProduct(body);
          }
        );


      case "updateProduct":
        return withAdmin(
          body,
          function () {
            return updateProduct(body);
          }
        );


      case "deleteProduct":
        return withAdmin(
          body,
          function () {
            return deleteProduct(body);
          }
        );


      case "addCategory":
        return withAdmin(
          body,
          function () {
            return addCategory(body);
          }
        );


      case "updateCategory":
        return withAdmin(
          body,
          function () {
            return updateCategory(body);
          }
        );


      case "deleteCategory":
        return withAdmin(
          body,
          function () {
            return deleteCategory(body);
          }
        );


      case "updateOrderStatus":
        return withAdmin(
          body,
          function () {
            return updateOrderStatus(body);
          }
        );


      case "updateSettings":
        return withAdmin(
          body,
          function () {
            return updateSettings(body);
          }
        );


      case "uploadProductImage":
        return withAdmin(
          body,
          function () {
            return uploadProductImage(body);
          }
        );


      case "changeAdminPassword":
        return withAdmin(
          body,
          function () {
            return changeAdminPassword(body);
          }
        );


      default:
        return fail("Unknown action");

    }

  } catch (err) {

    return fail(
      "Server error: " + err.message
    );

  }
}


// ============================================================
// PASSWORD HASHING
// ============================================================

function hashPassword(password) {

  var salted =
    String(password) +
    getSalt();

  var digest =
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      salted
    );

  return digest
    .map(function (b) {

      return (
        b < 0 ? b + 256 : b
      )
      .toString(16)
      .padStart(2, "0");

    })
    .join("");
}


// ============================================================
// ADMIN TOKEN
// ============================================================

function makeToken(username) {

  var expiry =
    new Date().getTime() +
    (1000 * 60 * 60 * 12);

  var payload =
    username +
    "|" +
    expiry;

  var signature =
    Utilities.computeHmacSha256Signature(
      payload,
      getSecret()
    );

  var signatureHex =
    signature
      .map(function (b) {

        return (
          b < 0 ? b + 256 : b
        )
        .toString(16)
        .padStart(2, "0");

      })
      .join("");

  return (
    Utilities.base64Encode(payload) +
    "." +
    signatureHex
  );
}


// ============================================================
// VERIFY ADMIN TOKEN
// ============================================================

function verifyToken(token) {

  if (!token) {
    return false;
  }

  var parts =
    String(token).split(".");

  if (parts.length !== 2) {
    return false;
  }

  try {

    var payload =
      Utilities
        .newBlob(
          Utilities.base64Decode(parts[0])
        )
        .getDataAsString();


    var expectedSignature =
      Utilities.computeHmacSha256Signature(
        payload,
        getSecret()
      );


    var expectedHex =
      expectedSignature
        .map(function (b) {

          return (
            b < 0 ? b + 256 : b
          )
          .toString(16)
          .padStart(2, "0");

        })
        .join("");


    if (
      expectedHex !== parts[1]
    ) {
      return false;
    }


    var pieces =
      payload.split("|");

    if (pieces.length < 2) {
      return false;
    }


    var expiry =
      parseInt(
        pieces[1],
        10
      );


    if (
      isNaN(expiry) ||
      new Date().getTime() > expiry
    ) {
      return false;
    }


    return true;

  } catch (error) {

    return false;

  }
}


// ============================================================
// ADMIN AUTHORIZATION
// ============================================================

function withAdmin(params, fn) {

  var token =
    params &&
    params.token
      ? params.token
      : "";

  if (!verifyToken(token)) {

    return fail(
      "Unauthorized - please login again"
    );

  }

  return fn();
}


// ============================================================
// ADMIN LOGIN
// ============================================================

function adminLogin(body) {

  var username =
    String(body.username || "")
      .trim();

  var password =
    String(body.password || "");


  if (!username || !password) {

    return fail(
      "Username and password required"
    );

  }


  var sheet =
    getSheet("Admin");

  var rows =
    sheet.getDataRange().getValues();


  if (rows.length < 2) {

    return fail(
      "No admin account found"
    );

  }


  var headers =
    rows[0];


  for (
    var i = 1;
    i < rows.length;
    i++
  ) {

    var row =
      rowToObject(
        headers,
        rows[i]
      );


    if (
      String(row.username) === username &&
      String(row.status) === "active"
    ) {

      if (
        String(row.passwordHash) ===
        hashPassword(password)
      ) {

        return ok(
          "Login successful",
          {
            token: makeToken(username),
            username: username
          }
        );

      }

    }

  }


  return fail(
    "Invalid username or password"
  );
}


// ============================================================
// CHANGE ADMIN PASSWORD
// ============================================================

function changeAdminPassword(body) {

  var oldPassword =
    String(body.oldPassword || "");

  var newPassword =
    String(body.newPassword || "");


  if (!oldPassword || !newPassword) {

    return fail(
      "Old and new password are required"
    );

  }


  if (newPassword.length < 6) {

    return fail(
      "New password must contain at least 6 characters"
    );

  }


  var username =
    getUsernameFromToken(body.token);

  if (!username) {

    return fail(
      "Invalid admin session"
    );

  }


  var sheet =
    getSheet("Admin");

  var rows =
    sheet.getDataRange().getValues();

  var headers =
    rows[0];


  for (
    var i = 1;
    i < rows.length;
    i++
  ) {

    var row =
      rowToObject(
        headers,
        rows[i]
      );


    if (
      String(row.username) === username
    ) {

      if (
        String(row.passwordHash) !==
        hashPassword(oldPassword)
      ) {

        return fail(
          "Old password is incorrect"
        );

      }


      var passwordCol =
        headers.indexOf("passwordHash") + 1;

      sheet
        .getRange(i + 1, passwordCol)
        .setValue(
          hashPassword(newPassword)
        );


      return ok(
        "Password changed successfully",
        {}
      );

    }

  }


  return fail(
    "Admin account not found"
  );
}


// ============================================================
// GET USERNAME FROM TOKEN
// ============================================================

function getUsernameFromToken(token) {

  if (!verifyToken(token)) {
    return "";
  }

  try {

    var parts =
      String(token).split(".");

    var payload =
      Utilities
        .newBlob(
          Utilities.base64Decode(parts[0])
        )
        .getDataAsString();

    var pieces =
      payload.split("|");

    return pieces[0] || "";

  } catch (error) {

    return "";

  }
}


// ============================================================
// GENERAL HELPERS
// ============================================================

function rowToObject(headers, row) {

  var obj = {};

  for (
    var i = 0;
    i < headers.length;
    i++
  ) {

    obj[headers[i]] =
      row[i];

  }

  return obj;
}


// ============================================================
// SHEET TO OBJECTS
// ============================================================

function sheetToObjects(sheet) {

  var data =
    sheet.getDataRange().getValues();


  if (data.length < 2) {
    return [];
  }


  var headers =
    data[0];

  var results = [];


  for (
    var i = 1;
    i < data.length;
    i++
  ) {

    if (
      data[i]
        .join("")
        .trim() === ""
    ) {
      continue;
    }


    results.push(
      rowToObject(
        headers,
        data[i]
      )
    );

  }


  return results;
}


// ============================================================
// FIND ROW BY ID
// ============================================================

function findRowIndexById(
  sheet,
  idColumnName,
  idValue
) {

  var data =
    sheet.getDataRange().getValues();


  if (data.length === 0) {
    return -1;
  }


  var headers =
    data[0];

  var idCol =
    headers.indexOf(
      idColumnName
    );


  if (idCol === -1) {
    return -1;
  }


  for (
    var i = 1;
    i < data.length;
    i++
  ) {

    if (
      String(data[i][idCol]) ===
      String(idValue)
    ) {

      return i + 1;

    }

  }


  return -1;
}


// ============================================================
// GENERATE ID
// ============================================================

function generateId(prefix) {

  return (
    prefix +
    "-" +
    new Date().getTime() +
    "-" +
    Math.floor(
      Math.random() * 1000
    )
  );
}


// ============================================================
// GENERATE ORDER ID
// ============================================================

function generateOrderId() {

  var timezone =
    Session.getScriptTimeZone() ||
    "GMT";

  var today =
    Utilities.formatDate(
      new Date(),
      timezone,
      "yyyyMMdd"
    );


  var sheet =
    getSheet("Orders");

  var data =
    sheet.getDataRange().getValues();


  var countToday = 0;


  for (
    var i = 1;
    i < data.length;
    i++
  ) {

    if (
      String(data[i][0])
        .indexOf(
          "FUR-" + today
        ) === 0
    ) {

      countToday++;

    }

  }


  var seq =
    String(
      countToday + 1
    ).padStart(3, "0");


  return (
    "FUR-" +
    today +
    "-" +
    seq
  );
}


// ============================================================
// PRODUCTS - GET ALL
// ============================================================

function getProducts(params) {

  var sheet =
    getSheet("Products");

  var products =
    sheetToObjects(sheet);


  products =
    products.filter(function (p) {

      return (
        String(p.status)
          .toLowerCase() ===
        "active"
      );

    });


  if (params.category) {

    products =
      products.filter(function (p) {

        return (
          String(p.category) ===
          String(params.category)
        );

      });

  }


  if (params.search) {

    var q =
      String(params.search)
        .toLowerCase()
        .trim();


    products =
      products.filter(function (p) {

        return (
          String(p.name)
            .toLowerCase()
            .indexOf(q) !== -1
        ) ||
        (
          String(p.description)
            .toLowerCase()
            .indexOf(q) !== -1
        ) ||
        (
          String(p.category)
            .toLowerCase()
            .indexOf(q) !== -1
        );

      });

  }


  if (
    String(params.featured)
      .toLowerCase() === "true"
  ) {

    products =
      products.filter(function (p) {

        return (
          String(p.featured)
            .toLowerCase() ===
          "true"
        );

      });

  }


  return products;
}


// ============================================================
// PRODUCTS - GET SINGLE
// ============================================================

function getProduct(productId) {

  if (!productId) {

    return fail(
      "productId is required"
    );

  }


  var sheet =
    getSheet("Products");

  var products =
    sheetToObjects(sheet);


  for (
    var i = 0;
    i < products.length;
    i++
  ) {

    if (
      String(products[i].productId) ===
      String(productId)
    ) {

      return ok(
        "Product fetched",
        products[i]
      );

    }

  }


  return fail(
    "Product not found"
  );
}


// ============================================================
// PRODUCTS - ADD
// ============================================================

function addProduct(body) {

  if (
    !body.name ||
    !body.category ||
    body.price === undefined
  ) {

    return fail(
      "Name, category and price are required"
    );

  }


  var price =
    Number(body.price);

  if (isNaN(price) || price < 0) {

    return fail(
      "Invalid product price"
    );

  }


  var sheet =
    getSheet("Products");

  var productId =
    generateId("PRD");

  var now =
    new Date();


  sheet.appendRow([

    productId,

    body.name,

    body.category,

    body.description || "",

    body.specifications || "",

    price,

    Number(body.originalPrice) || 0,

    Number(body.discount) || 0,

    Number(body.stock) || 0,

    body.images || "",

    body.status || "active",

    (
      body.featured === true ||
      body.featured === "true"
    )
      ? "true"
      : "false",

    now,

    now

  ]);


  return ok(
    "Product added successfully",
    {
      productId: productId
    }
  );
}


// ============================================================
// PRODUCTS - UPDATE
// ============================================================

function updateProduct(body) {

  if (!body.productId) {

    return fail(
      "productId is required"
    );

  }


  var sheet =
    getSheet("Products");

  var rowIndex =
    findRowIndexById(
      sheet,
      "productId",
      body.productId
    );


  if (rowIndex === -1) {

    return fail(
      "Product not found"
    );

  }


  var headers =
    sheet.getDataRange()
      .getValues()[0];


  var fields = [

    "name",
    "category",
    "description",
    "specifications",
    "price",
    "originalPrice",
    "discount",
    "stock",
    "images",
    "status",
    "featured"

  ];


  fields.forEach(function (field) {

    if (
      body[field] !== undefined
    ) {

      var col =
        headers.indexOf(field) + 1;


      if (col <= 0) {
        return;
      }


      var value =
        body[field];


      if (
        [
          "price",
          "originalPrice",
          "discount",
          "stock"
        ].indexOf(field) !== -1
      ) {

        value =
          Number(value) || 0;

      }


      if (field === "featured") {

        value =
          (
            value === true ||
            value === "true"
          )
            ? "true"
            : "false";

      }


      sheet
        .getRange(
          rowIndex,
          col
        )
        .setValue(value);

    }

  });


  var updatedCol =
    headers.indexOf("updatedAt") + 1;


  if (updatedCol > 0) {

    sheet
      .getRange(
        rowIndex,
        updatedCol
      )
      .setValue(
        new Date()
      );

  }


  return ok(
    "Product updated successfully",
    {}
  );
}


// ============================================================
// PRODUCTS - DELETE
// ============================================================

function deleteProduct(body) {

  if (!body.productId) {

    return fail(
      "productId is required"
    );

  }


  var sheet =
    getSheet("Products");


  var rowIndex =
    findRowIndexById(
      sheet,
      "productId",
      body.productId
    );


  if (rowIndex === -1) {

    return fail(
      "Product not found"
    );

  }


  sheet.deleteRow(
    rowIndex
  );


  return ok(
    "Product deleted successfully",
    {}
  );
}


// ============================================================
// CATEGORIES - GET
// ============================================================

function getCategories() {

  var sheet =
    getSheet("Categories");

  var categories =
    sheetToObjects(sheet);


  return categories.filter(
    function (c) {

      return (
        String(c.status)
          .toLowerCase() ===
        "active"
      );

    }
  );
}


// ============================================================
// CATEGORIES - ADD
// ============================================================

function addCategory(body) {

  if (!body.name) {

    return fail(
      "Category name is required"
    );

  }


  var sheet =
    getSheet("Categories");

  var categoryId =
    generateId("CAT");


  sheet.appendRow([

    categoryId,

    body.name,

    body.description || "",

    body.image || "",

    body.status || "active",

    new Date()

  ]);


  return ok(
    "Category added successfully",
    {
      categoryId: categoryId
    }
  );
}


// ============================================================
// CATEGORIES - UPDATE
// ============================================================

function updateCategory(body) {

  if (!body.categoryId) {

    return fail(
      "categoryId is required"
    );

  }


  var sheet =
    getSheet("Categories");


  var rowIndex =
    findRowIndexById(
      sheet,
      "categoryId",
      body.categoryId
    );


  if (rowIndex === -1) {

    return fail(
      "Category not found"
    );

  }


  var headers =
    sheet.getDataRange()
      .getValues()[0];


  [
    "name",
    "description",
    "image",
    "status"
  ].forEach(function (field) {

    if (
      body[field] !== undefined
    ) {

      var col =
        headers.indexOf(field) + 1;


      if (col > 0) {

        sheet
          .getRange(
            rowIndex,
            col
          )
          .setValue(
            body[field]
          );

      }

    }

  });


  return ok(
    "Category updated successfully",
    {}
  );
}


// ============================================================
// CATEGORIES - DELETE
// ============================================================

function deleteCategory(body) {

  if (!body.categoryId) {

    return fail(
      "categoryId is required"
    );

  }


  var sheet =
    getSheet("Categories");


  var rowIndex =
    findRowIndexById(
      sheet,
      "categoryId",
      body.categoryId
    );


  if (rowIndex === -1) {

    return fail(
      "Category not found"
    );

  }


  sheet.deleteRow(
    rowIndex
  );


  return ok(
    "Category deleted successfully",
    {}
  );
}


// ============================================================
// ORDERS - CREATE
// ============================================================

function createOrder(body) {

  if (
    !body.customerName ||
    !body.phone ||
    !body.address ||
    !body.city ||
    !body.paymentMethod
  ) {

    return fail(
      "Please fill all required fields"
    );

  }


  var phone =
    String(body.phone).trim();


  if (
    !/^[0-9+\-\s]{7,15}$/.test(phone)
  ) {

    return fail(
      "Please enter a valid phone number"
    );

  }


  if (
    !body.items ||
    !Array.isArray(body.items) ||
    body.items.length === 0
  ) {

    return fail(
      "Cart is empty"
    );

  }


  var settings =
    getSettings();


  var deliveryCharges;


  if (
    String(body.paymentMethod)
      .toUpperCase() === "COD"
  ) {

    deliveryCharges =
      Number(
        settings.codDeliveryCharge || 300
      );

  } else {

    deliveryCharges =
      Number(
        settings.advanceDeliveryCharge || 250
      );

  }


  var productsSheet =
    getSheet("Products");


  var productRows =
    productsSheet
      .getDataRange()
      .getValues();


  if (productRows.length < 2) {

    return fail(
      "No products available"
    );

  }


  var headers =
    productRows[0];


  var idCol =
    headers.indexOf("productId");

  var stockCol =
    headers.indexOf("stock");

  var priceCol =
    headers.indexOf("price");

  var nameCol =
    headers.indexOf("name");

  var statusCol =
    headers.indexOf("status");


  if (
    idCol === -1 ||
    stockCol === -1 ||
    priceCol === -1 ||
    nameCol === -1
  ) {

    return fail(
      "Products sheet structure is invalid"
    );

  }


  var subtotal = 0;

  var validatedItems = [];


  for (
    var i = 0;
    i < body.items.length;
    i++
  ) {

    var item =
      body.items[i];


    var found = false;


    for (
      var r = 1;
      r < productRows.length;
      r++
    ) {

      if (
        String(
          productRows[r][idCol]
        ) ===
        String(item.productId)
      ) {

        found = true;


        if (
          statusCol !== -1 &&
          String(
            productRows[r][statusCol]
          ).toLowerCase() !== "active"
        ) {

          return fail(
            productRows[r][nameCol] +
            " is not available"
          );

        }


        var stock =
          Number(
            productRows[r][stockCol]
          );


        var qty =
          Number(
            item.quantity
          );


        if (
          !isFinite(qty) ||
          qty < 1 ||
          Math.floor(qty) !== qty
        ) {

          return fail(
            "Invalid quantity for " +
            productRows[r][nameCol]
          );

        }


        if (stock < qty) {

          return fail(
            productRows[r][nameCol] +
            " is out of stock or has insufficient stock"
          );

        }


        var price =
          Number(
            productRows[r][priceCol]
          );


        if (
          isNaN(price) ||
          price < 0
        ) {

          return fail(
            "Invalid price for " +
            productRows[r][nameCol]
          );

        }


        subtotal +=
          price * qty;


        validatedItems.push({

          productId:
            item.productId,

          productName:
            productRows[r][nameCol],

          price:
            price,

          quantity:
            qty,

          rowIndex:
            r + 1,

          currentStock:
            stock

        });


        break;

      }

    }


    if (!found) {

      return fail(
        "One of the products in your cart is no longer available"
      );

    }

  }


  var total =
    subtotal +
    deliveryCharges;


  var orderId =
    generateOrderId();


  var now =
    new Date();


  var ordersSheet =
    getSheet("Orders");


  ordersSheet.appendRow([

    orderId,

    body.customerName,

    phone,

    body.email || "",

    body.address,

    body.city,

    body.paymentMethod,

    deliveryCharges,

    subtotal,

    total,

    "Pending",

    now,

    now

  ]);


  var itemsSheet =
    getSheet("OrderItems");


  validatedItems.forEach(
    function (it) {

      var itemId =
        generateId("ITM");


      itemsSheet.appendRow([

        itemId,

        orderId,

        it.productId,

        it.productName,

        it.price,

        it.quantity,

        it.price *
        it.quantity

      ]);


      productsSheet
        .getRange(
          it.rowIndex,
          stockCol + 1
        )
        .setValue(
          it.currentStock -
          it.quantity
        );

    }
  );


  return ok(
    "Order placed successfully",
    {

      orderId:
        orderId,

      customerName:
        body.customerName,

      items:
        validatedItems,

      subtotal:
        subtotal,

      deliveryCharges:
        deliveryCharges,

      total:
        total,

      paymentMethod:
        body.paymentMethod,

      status:
        "Pending"

    }
  );
}


// ============================================================
// ORDERS - GET ALL
// ============================================================

function getOrders(params) {

  var orders =
    sheetToObjects(
      getSheet("Orders")
    );


  if (params.status) {

    orders =
      orders.filter(
        function (o) {

          return (
            String(o.status) ===
            String(params.status)
          );

        }
      );

  }


  if (params.search) {

    var q =
      String(params.search)
        .toLowerCase()
        .trim();


    orders =
      orders.filter(
        function (o) {

          return (

            String(o.orderId)
              .toLowerCase()
              .indexOf(q) !== -1

          ) ||

          (

            String(o.customerName)
              .toLowerCase()
              .indexOf(q) !== -1

          ) ||

          (

            String(o.phone)
              .toLowerCase()
              .indexOf(q) !== -1

          );

        }
      );

  }


  orders.sort(
    function (a, b) {

      return (
        new Date(b.createdAt) -
        new Date(a.createdAt)
      );

    }
  );


  return orders;
}


// ============================================================
// ORDERS - GET SINGLE
// ============================================================

function getOrder(orderId) {

  if (!orderId) {

    return fail(
      "orderId is required"
    );

  }


  var orders =
    sheetToObjects(
      getSheet("Orders")
    );


  var order = null;


  for (
    var i = 0;
    i < orders.length;
    i++
  ) {

    if (
      String(
        orders[i].orderId
      ) ===
      String(orderId)
    ) {

      order =
        orders[i];

      break;

    }

  }


  if (!order) {

    return fail(
      "Order not found"
    );

  }


  var items =
    sheetToObjects(
      getSheet("OrderItems")
    );


  order.items =
    items.filter(
      function (it) {

        return (
          String(it.orderId) ===
          String(orderId)
        );

      }
    );


  return ok(
    "Order fetched",
    order
  );
}


// ============================================================
// ORDER STATUS UPDATE
// ============================================================

function updateOrderStatus(body) {

  if (
    !body.orderId ||
    !body.status
  ) {

    return fail(
      "orderId and status are required"
    );

  }


  var validStatuses = [

    "Pending",
    "Confirmed",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled"

  ];


  if (
    validStatuses.indexOf(
      body.status
    ) === -1
  ) {

    return fail(
      "Invalid status"
    );

  }


  var sheet =
    getSheet("Orders");


  var rowIndex =
    findRowIndexById(
      sheet,
      "orderId",
      body.orderId
    );


  if (rowIndex === -1) {

    return fail(
      "Order not found"
    );

  }


  var headers =
    sheet.getDataRange()
      .getValues()[0];


  var statusCol =
    headers.indexOf("status") + 1;


  var updatedCol =
    headers.indexOf("updatedAt") + 1;


  var currentStatus =
    sheet
      .getRange(
        rowIndex,
        statusCol
      )
      .getValue();


  // Restore stock when cancelling
  // an order for the first time.

  if (
    body.status === "Cancelled" &&
    currentStatus !== "Cancelled"
  ) {

    var items =
      sheetToObjects(
        getSheet("OrderItems")
      ).filter(
        function (it) {

          return (
            String(it.orderId) ===
            String(body.orderId)
          );

        }
      );


    var productsSheet =
      getSheet("Products");


    var pHeaders =
      productsSheet
        .getDataRange()
        .getValues()[0];


    var stockCol =
      pHeaders.indexOf("stock") + 1;


    items.forEach(
      function (it) {

        var pRow =
          findRowIndexById(
            productsSheet,
            "productId",
            it.productId
          );


        if (pRow !== -1) {

          var currentStock =
            Number(
              productsSheet
                .getRange(
                  pRow,
                  stockCol
                )
                .getValue()
            );


          productsSheet
            .getRange(
              pRow,
              stockCol
            )
            .setValue(
              currentStock +
              Number(it.quantity)
            );

        }

      }
    );

  }


  sheet
    .getRange(
      rowIndex,
      statusCol
    )
    .setValue(
      body.status
    );


  if (updatedCol > 0) {

    sheet
      .getRange(
        rowIndex,
        updatedCol
      )
      .setValue(
        new Date()
      );

  }


  return ok(
    "Order status updated successfully",
    {}
  );
}


// ============================================================
// SETTINGS - GET
// ============================================================

function getSettings() {

  var sheet =
    getSheet("Settings");


  var rows =
    sheet.getDataRange()
      .getValues();


  var settings = {};


  for (
    var i = 1;
    i < rows.length;
    i++
  ) {

    if (
      rows[i][0] === ""
    ) {

      continue;

    }


    settings[
      rows[i][0]
    ] =
      rows[i][1];

  }


  return settings;
}


// ============================================================
// SETTINGS - UPDATE
// ============================================================

function updateSettings(body) {

  if (
    !body.settings ||
    typeof body.settings !== "object"
  ) {

    return fail(
      "settings object is required"
    );

  }


  var sheet =
    getSheet("Settings");


  var data =
    sheet.getDataRange()
      .getValues();


  var existingKeys = {};


  for (
    var i = 1;
    i < data.length;
    i++
  ) {

    existingKeys[
      data[i][0]
    ] =
      i + 1;

  }


  Object.keys(
    body.settings
  ).forEach(
    function (key) {

      var value =
        body.settings[key];


      if (
        existingKeys[key]
      ) {

        sheet
          .getRange(
            existingKeys[key],
            2
          )
          .setValue(
            value
          );

      } else {

        sheet.appendRow([
          key,
          value
        ]);

      }

    }
  );


  return ok(
    "Settings updated successfully",
    {}
  );
}


// ============================================================
// DASHBOARD STATISTICS
// ============================================================

function getDashboardStats() {

  var products =
    sheetToObjects(
      getSheet("Products")
    );


  var orders =
    sheetToObjects(
      getSheet("Orders")
    );


  var settings =
    getSettings();


  var lowStockLimit =
    Number(
      settings.lowStockLimit || 5
    );


  var stats = {

    totalProducts:
      products.length,

    totalOrders:
      orders.length,

    pendingOrders:
      0,

    confirmedOrders:
      0,

    processingOrders:
      0,

    shippedOrders:
      0,

    deliveredOrders:
      0,

    cancelledOrders:
      0,

    lowStockProducts:
      0,

    totalSales:
      0

  };


  orders.forEach(
    function (o) {

      if (
        o.status === "Pending"
      ) {

        stats.pendingOrders++;

      }


      if (
        o.status === "Confirmed"
      ) {

        stats.confirmedOrders++;

      }


      if (
        o.status === "Processing"
      ) {

        stats.processingOrders++;

      }


      if (
        o.status === "Shipped"
      ) {

        stats.shippedOrders++;

      }


      if (
        o.status === "Delivered"
      ) {

        stats.deliveredOrders++;

      }


      if (
        o.status === "Cancelled"
      ) {

        stats.cancelledOrders++;

      }


      if (
        o.status !== "Cancelled"
      ) {

        stats.totalSales +=
          Number(o.total) || 0;

      }

    }
  );


  products.forEach(
    function (p) {

      if (
        Number(p.stock) <=
        lowStockLimit
      ) {

        stats.lowStockProducts++;

      }

    }
  );


  return stats;
}


// ============================================================
// PRODUCT IMAGE UPLOAD
// Google Drive
// ============================================================

function uploadProductImage(body) {

  try {

    var folderId =
      "12nAN0YBhRbQ5GiiJ6Hhdq3JY_kUhywTq";


    if (!body.base64Data) {

      return fail(
        "Image data is required"
      );

    }


    if (!body.fileName) {

      return fail(
        "File name is required"
      );

    }


    var folder =
      DriveApp.getFolderById(
        folderId
      );


    var bytes =
      Utilities.base64Decode(
        body.base64Data
      );


    var mimeType =
      body.mimeType ||
      "image/jpeg";


    var blob =
      Utilities.newBlob(
        bytes,
        mimeType,
        body.fileName
      );


    var file =
      folder.createFile(
        blob
      );


    file.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );


    var fileId =
      file.getId();


    var imageUrl =
      "https://lh3.googleusercontent.com/d/" +
      fileId;


    return ok(
      "Image uploaded successfully",
      {

        url:
          imageUrl,

        fileId:
          fileId,

        fileName:
          file.getName()

      }
    );


  } catch (error) {

    return fail(
      "Image upload failed: " +
      error.message
    );

  }
}


// ============================================================
// SETUP SHEETS
// ============================================================
//
// IMPORTANT:
// Ye function sirf FIRST TIME run karein.
//
// Is function ko dobara run karne par existing data clear
// ho jayega.
// ============================================================

function setupSheets() {

  var ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  var sheetsConfig = {

    "Products": [

      "productId",
      "name",
      "category",
      "description",
      "specifications",
      "price",
      "originalPrice",
      "discount",
      "stock",
      "images",
      "status",
      "featured",
      "createdAt",
      "updatedAt"

    ],


    "Categories": [

      "categoryId",
      "name",
      "description",
      "image",
      "status",
      "createdAt"

    ],


    "Orders": [

      "orderId",
      "customerName",
      "phone",
      "email",
      "address",
      "city",
      "paymentMethod",
      "deliveryCharges",
      "subtotal",
      "total",
      "status",
      "createdAt",
      "updatedAt"

    ],


    "OrderItems": [

      "itemId",
      "orderId",
      "productId",
      "productName",
      "price",
      "quantity",
      "subtotal"

    ],


    "Admin": [

      "adminId",
      "username",
      "passwordHash",
      "status"

    ],


    "Settings": [

      "setting",
      "value"

    ]

  };


  Object.keys(
    sheetsConfig
  ).forEach(
    function (name) {

      var sheet =
        ss.getSheetByName(name);


      if (!sheet) {

        sheet =
          ss.insertSheet(name);

      }


      sheet.clear();


      sheet.appendRow(
        sheetsConfig[name]
      );


      sheet.setFrozenRows(1);

    }
  );


  // Remove default Sheet1

  var defaultSheet =
    ss.getSheetByName(
      "Sheet1"
    );


  if (
    defaultSheet &&
    ss.getSheets().length > 1
  ) {

    ss.deleteSheet(
      defaultSheet
    );

  }


  // ========================================================
  // DEFAULT ADMIN
  // ========================================================

  var adminSheet =
    ss.getSheetByName(
      "Admin"
    );


  if (
    adminSheet.getLastRow() < 2
  ) {

    adminSheet.appendRow([

      "ADM-001",

      "admin",

      hashPassword(
        "admin123"
      ),

      "active"

    ]);

  }


  // ========================================================
  // DEFAULT SETTINGS
  // ========================================================

  var settingsSheet =
    ss.getSheetByName(
      "Settings"
    );


  if (
    settingsSheet.getLastRow() < 2
  ) {

    var defaults = [

      [
        "brandName",
        "Furonix"
      ],

      [
        "logo",
        ""
      ],

      [
        "favicon",
        ""
      ],

      [
        "phone",
        "03274170487"
      ],

      [
        "email",
        "rs9409035@gmail.com"
      ],

      [
        "whatsapp",
        "03274170487"
      ],

      [
        "storeDescription",
        "Quality smart watches, AirPods, power banks and electronics."
      ],

      [
        "footerText",
        "© Furonix. All rights reserved."
      ],

      [
        "facebookUrl",
        ""
      ],

      [
        "instagramUrl",
        ""
      ],

      [
        "codDeliveryCharge",
        300
      ],

      [
        "advanceDeliveryCharge",
        250
      ],

      [
        "advancePaymentMethod",
        "Easypaisa"
      ],

      [
        "advanceAccountTitle",
        "Sami Ullah"
      ],

      [
        "advanceAccountNumber",
        "03274170487"
      ],

      [
        "advancePaymentInstructions",
        "Send advance payment to the Easypaisa number above and share the screenshot on WhatsApp after placing your order."
      ],

      [
        "currency",
        "Rs."
      ],

      [
        "announcementText",
        ""
      ],

      [
        "themeColor",
        "#6c5ce7"
      ],

      [
        "buttonColor",
        "#6c5ce7"
      ],

      [
        "bannerHeading",
        "Latest Electronics at Best Prices"
      ],

      [
        "bannerDescription",
        "Shop Smart Watches, AirPods, Power Banks and more."
      ],

      [
        "bannerButtonText",
        "Shop Now"
      ],

      [
        "lowStockLimit",
        5
      ]

    ];


    defaults.forEach(
      function (row) {

        settingsSheet
          .appendRow(row);

      }
    );

  }


  // ========================================================
  // DEFAULT CATEGORIES
  // ========================================================

  var catSheet =
    ss.getSheetByName(
      "Categories"
    );


  if (
    catSheet.getLastRow() < 2
  ) {

    var cats = [

      [
        "CAT-001",
        "Smart Watches",
        "Latest smart watches",
        "",
        "active",
        new Date()
      ],

      [
        "CAT-002",
        "AirPods",
        "Wireless earbuds",
        "",
        "active",
        new Date()
      ],

      [
        "CAT-003",
        "Power Banks",
        "Portable chargers",
        "",
        "active",
        new Date()
      ],

      [
        "CAT-004",
        "Electronics",
        "Small electronics",
        "",
        "active",
        new Date()
      ],

      [
        "CAT-005",
        "Other Products",
        "Other useful products",
        "",
        "active",
        new Date()
      ]

    ];


    cats.forEach(
      function (row) {

        catSheet.appendRow(
          row
        );

      }
    );

  }


  Logger.log(
    "Furonix setup completed successfully."
  );


  Logger.log(
    "Default admin username: admin"
  );


  Logger.log(
    "Default admin password: admin123"
  );

}


// ============================================================
// OPTIONAL: TEST BACKEND
// ============================================================

function testBackend() {

  var result = {

    sheets: [],
    settings: {},
    categories: [],
    products: [],
    orders: []

  };


  var sheetNames = [

    "Products",
    "Categories",
    "Orders",
    "OrderItems",
    "Admin",
    "Settings"

  ];


  sheetNames.forEach(
    function (name) {

      var sheet =
        SpreadsheetApp
          .getActiveSpreadsheet()
          .getSheetByName(name);


      if (sheet) {

        result.sheets.push(
          name
        );

      }

    }
  );


  result.settings =
    getSettings();


  result.categories =
    getCategories();


  result.products =
    sheetToObjects(
      getSheet("Products")
    );
  result.orders =
    sheetToObjects(
      getSheet("Orders")
    );
  Logger.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );
  return ok(
    "Backend test completed",
    result
  );
}
