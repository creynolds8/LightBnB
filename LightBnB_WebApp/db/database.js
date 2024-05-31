const properties = require("./json/properties.json");
const users = require("./json/users.json");

const { Pool } = require("pg");

const pool = new Pool({
  user: "development",
  password: "development",
  host: "localhost",
  database: "lightbnb",
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  //dont need variable assignment, can add values directly into values array
  const queryEmail = email;
  const values = [ queryEmail ];
  const queryString = `
  SELECT * FROM users
  WHERE email = $1;
  `;

  return pool
    .query(queryString, values)
    .then((res) => {
      return res.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    })
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  //dont need variable assignment, can add values directly into values array
  const queryId = id;
  const values = [ queryId ];
  const queryString = `
  SELECT * FROM users 
  WHERE id = $1;
  `;
  
  return pool
   .query(queryString, values)
   .then((res) => {
    return res.rows[0]
  })
   .catch((err) => {
    console.log(err.message);
   })
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  //dont need variable assignment, can add values directly into values array
  const queryName = user.name
  const queryEmail = user.email;
  const queryPassword = user.password;
  const values = [ queryName, queryEmail, queryPassword ];

  const queryString = `
  INSERT INTO users (name, email, password) 
  VALUES ($1, $2, $3)
  RETURNING *;
  `;
  
  return pool
    .query(queryString, values)
    .then((res) => {
      return res.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    })
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const values = [ guest_id, limit ];
  const queryString = `
  SELECT reservations.*, properties.*, AVG(rating) AS average_rating
  FROM reservations
  JOIN properties ON properties.id = property_id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1 
  AND reservations.end_date < now()::date
  GROUP BY reservations.id, properties.id
  ORDER BY start_date
  LIMIT $2;
  `;

  return pool
    .query(queryString, values)
    .then((res) => {    
      return res.rows;
    })
    .catch((err) => {
      console.log(err.message);
    })
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {
  console.log(options);
  const queryParams = [];
  let queryString = `
      SELECT properties.*, AVG(property_reviews.rating) AS average_rating
      FROM properties
      LEFT JOIN property_reviews ON properties.id = property_id
      `;
      let hasCondition = false;
      if (options.owner_id) {
        queryParams.push(options.owner_id);
        const searchParam = queryParams.length === 1 ? 'WHERE' : 'AND';
        queryString += `${searchParam} owner_id = $${queryParams.length}::integer`;
        hasCondition = true;
      }  
      if (options.city) {
        queryParams.push(`%${options.city}%`);
        queryString += `${hasCondition ? 'AND' : 'WHERE'} city LIKE $${queryParams.length}`;
        hasCondition = true;
      }
      if (options.minimum_price_per_night) {
        queryParams.push(options.minimum_price_per_night * 100);
        queryString += `${hasCondition ? '\nAND' : 'WHERE'} cost_per_night >= $${queryParams.length}::INTEGER`;
        hasCondition = true;
      }
      if (options.maximum_price_per_night) {
        queryParams.push(options.maximum_price_per_night * 100);
        queryString += `${hasCondition ? '\nAND' : 'WHERE'} cost_per_night =< $${queryParams.length}::INTEGER`;
        hasCondition = true;
      }
      queryString += '\nGROUP BY properties.id'
      if (options.minimum_rating) {
        queryParams.push(options.minimum_rating);
        queryString += `
        HAVING AVG(rating) >= $${queryParams.length}::INTEGER`;
        hasCondition = true;
      }

      queryParams.push(limit);
      queryString += `
      ORDER BY cost_per_night
      LIMIT $${queryParams.length};
      `;

      console.log(queryString, queryParams);

  return pool
    .query(queryString, queryParams)
    .then((res) => { return res.rows})
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
