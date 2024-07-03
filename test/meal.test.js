process.env.DB_DATABASE = process.env.DB_DATABASE || 'share-a-meal-testdb'

const chai = require('chai')
const chaiHttp = require('chai-http')
const server = require('../index')
const expect = chai.expect
const db = require('../src/dao/mysql-db')
const logger = require('../src/util/logger')
const jwt = require('jsonwebtoken')
const jwtSecretKey = require('../src/util/config').secretkey

chai.use(chaiHttp)

const endpointToTest = '/api/meal'

const CLEAR_MEAL_TABLE = 'DELETE IGNORE FROM `meal`;'
const CLEAR_PARTICIPANTS_TABLE = 'DELETE IGNORE FROM `meal_participants_user`;'
const CLEAR_USERS_TABLE = 'DELETE IGNORE FROM `user`;'
const CLEAR_DB = CLEAR_MEAL_TABLE + CLEAR_PARTICIPANTS_TABLE + CLEAR_USERS_TABLE

const INSERT_USER =
    'INSERT INTO `user` (`id`, `firstName`, `lastName`, `emailAdress`, `password`, `street`, `city` ) VALUES' +
    '(1, "first", "last", "name@server.nl", "secret", "street", "city");'

const INSERT_USER2 =
    'INSERT INTO `user` (`id`, `firstName`, `lastName`, `emailAdress`, `password`, `street`, `city` ) VALUES' +
    '(2, "first", "last", "name2@server.nl", "secret", "street", "city");'

const INSERT_MEALS =
    'INSERT INTO `meal` (`id`, `name`, `description`, `imageUrl`, `dateTime`, `maxAmountOfParticipants`, `price`, `cookId`) VALUES' +
    "(1, 'Meal A', 'description', 'image url', NOW(), 5, 6.50, 1)," +
    "(2, 'Meal B', 'description', 'image url', NOW(), 0, 6.50, 1);"

describe('UC-301 Toevoegen', () => {
    const token = jwt.sign({ userId: 1 }, jwtSecretKey)
    beforeEach((done) => {
        logger.debug('beforeEach called')
        // maak de testdatabase leeg zodat we onze testen kunnen uitvoeren.
        db.getConnection(function (err, connection) {
            if (err) throw err // not connected!

            // Use the connection
            connection.query(
                CLEAR_DB + INSERT_USER,
                function (error, results, fields) {
                    // When done with the connection, release it.
                    connection.release()

                    // Handle error after the release.
                    if (error) throw error
                    // Let op dat je done() pas aanroept als de query callback eindigt!
                    logger.debug('beforeEach done')
                    done()
                }
            )
        })
    })

    describe('TC-301-1 Verplicht veld ontbreekt', () => {
        it('should return an error message', (done) => {
            chai.request(server)
                .post(`${endpointToTest}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    isActive: 1,
                    isVega: 0,
                    isVegan: 0,
                    isToTakeHome: 0,
                    dateTime: '2022-06-26',
                    maxAmountOfParticipants: 4,
                    price: 13.25,
                    imageUrl: 'htpass',
                    cookid: 1,
                    createDate: '2022-06-26',
                    updateDate: '2022-06-26',
                    // name: 'Pasta',
                    description: 'lekker',
                    allergenes: 'gluten'
                })
                .end((err, res) => {
                    res.should.have.status(400)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('Missing required fields')
                    done()
                })
        })
    })

    describe('TC-301-2 Niet ingelogd', () => {
        it('should return an error message', (done) => {
            chai.request(server)
                .post(`${endpointToTest}`)
                .set('Authorization', `Bearer ertyuioghjkl;`)
                .send({
                    isActive: 1,
                    isVega: 0,
                    isVegan: 0,
                    isToTakeHome: 0,
                    dateTime: '2022-06-26',
                    maxAmountOfParticipants: 4,
                    price: 13.25,
                    imageUrl: 'htpass',
                    cookid: 1,
                    createDate: '2022-06-26',
                    updateDate: '2022-06-26',
                    name: 'Pasta',
                    description: 'lekker',
                    allergenes: 'gluten'
                })
                .end((err, res) => {
                    res.should.have.status(401)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('Not authorized!')
                    done()
                })
        })
    })

    describe('TC-301-3 Maaltijd succesvol toegevoegd', () => {
        it('should return a success message and meal data', (done) => {
            chai.request(server)
                .post(`${endpointToTest}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    isActive: 1,
                    isVega: 0,
                    isVegan: 0,
                    isToTakeHome: 0,
                    dateTime: '2022-06-26',
                    maxAmountOfParticipants: 4,
                    price: 13.25,
                    imageUrl: 'htpass',
                    cookid: 1,
                    createDate: '2022-06-26',
                    updateDate: '2022-06-26',
                    name: 'Pasta',
                    description: 'lekker',
                    allergenes: 'gluten'
                })
                .end((err, res) => {
                    res.should.have.status(201)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('Meal created successfully')
                    done()
                })
        })
    })
})

describe('UC-302 Wijzigen van maaltijdsgegevens', () => {
    const token = jwt.sign({ userId: 1 }, jwtSecretKey)
    before((done) => {
        logger.debug('beforeEach called')
        // maak de testdatabase leeg zodat we onze testen kunnen uitvoeren.
        db.getConnection(function (err, connection) {
            if (err) throw err // not connected!

            // Use the connection
            connection.query(
                CLEAR_DB + INSERT_USER + INSERT_MEALS,
                function (error, results, fields) {
                    // When done with the connection, release it.
                    connection.release()

                    // Handle error after the release.
                    if (error) throw error
                    // Let op dat je done() pas aanroept als de query callback eindigt!
                    logger.debug('beforeEach done')
                    done()
                }
            )
        })
    })

    describe('TC-302-1 Verplicht veld ontbreekt', () => {
        it('should return an error message', (done) => {
            chai.request(server)
                .put(endpointToTest + '/1') // Ensure correct endpoint
                .set('Authorization', `Bearer ${token}`)
                .send({
                    isActive: 1,
                    isVega: 0,
                    isVegan: 0,
                    isToTakeHome: 0,
                    dateTime: '2022-06-26',
                    maxAmountOfParticipants: 4,
                    price: 13.25,
                    imageUrl: 'htpass',
                    cookid: 1,
                    createDate: '2022-06-26',
                    updateDate: '2022-06-26',
                    // Missing name field
                    description: 'lekker',
                    allergenes: 'gluten'
                })
                .end((err, res) => {
                    res.should.have.status(400)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('Missing required fields')
                    done()
                })
        })
    })

    describe('TC-302-2 Niet ingelogd', () => {
        it('should return an error message', (done) => {
            chai.request(server)
                .put(endpointToTest + '/1') // Ensure correct endpoint
                .set('Authorization', `Bearer invalid_token`)
                .send({
                    name: 'Spaghetti',
                    price: 14.5,
                    maxAmountOfParticipants: 5
                })
                .end((err, res) => {
                    res.should.have.status(401)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('Not authorized!')
                    done()
                })
        })
    })

    describe('TC-302-3 Niet de eigenaar van de data', () => {
        it('should return an error message', (done) => {
            chai.request(server)
                .put(endpointToTest + '/2') // Ensure correct endpoint
                .set(
                    'Authorization',
                    `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQxLCJpYXQiOjE3MTk0MTc4ODQsImV4cCI6MTcyMDQ1NDY4NH0.TztKIOzdSKwHAc-x806flHpVA01S8R5k7DiBqLlJzGQ`
                ) // Use another user's token
                .send({
                    name: 'Spaghetti',
                    price: 14.5,
                    maxAmountOfParticipants: 5
                })
                .end((err, res) => {
                    res.should.have.status(403)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('Je bent niet de eigenaar van de data')
                    done()
                })
        })
    })

    describe('TC-302-4 Maaltijd bestaat niet', () => {
        it('should return an error message', (done) => {
            chai.request(server)
                .put(endpointToTest + '/99999') // Ensure correct endpoint
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Spaghetti',
                    price: 14.5,
                    maxAmountOfParticipants: 5
                })
                .end((err, res) => {
                    res.should.have.status(404)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('Meal not found')
                    done()
                })
        })
    })

    describe('TC-302-5 Maaltijd succesvol gewijzigd', () => {
        it('should return a success message and updated meal data', (done) => {
            chai.request(server)
                .put(endpointToTest + '/1')
                .set('Authorization', 'Bearer ' + token)
                .send({
                    isActive: 1,
                    isVega: 1,
                    isVegan: 1,
                    isToTakeHome: 1,
                    dateTime: '2023-12-31 14:30:00',
                    maxAmountOfParticipants: 10,
                    price: 10.0,
                    imgURL: 'https://www.img.com',
                    createDate: '2023-12-31 14:30:00',
                    updateDate: '2023-12-31 14:30:00',
                    name: 'food',
                    description: 'nice food',
                    allergenes: 'gluten'
                })
                .end((err, res) => {
                    assert.ifError(err)
                    res.should.have.status(201)
                    res.body.should.be.an
                        .an('object')
                        .that.has.all.keys('status', 'message', 'data')
                    res.body.status.should.be.a('number')
                    res.body.data.should.be.an('object').that.is.not.empty
                    res.body.message.should.contain('meal updated with id')
                    done()
                })
        })
    })
})

describe('UC-303 Opvragen van alle maaltijden', () => {
    /**
     * Voorbeeld van een beforeEach functie.
     * Hiermee kun je code hergebruiken of initialiseren.
     */
    beforeEach((done) => {
        logger.debug('beforeEach called')
        // maak de testdatabase leeg zodat we onze testen kunnen uitvoeren.
        db.getConnection(function (err, connection) {
            if (err) throw err // not connected!

            // Use the connection
            connection.query(
                CLEAR_DB + INSERT_USER + INSERT_MEALS,
                function (error, results, fields) {
                    // When done with the connection, release it.
                    connection.release()

                    // Handle error after the release.
                    if (error) throw error
                    // Let op dat je done() pas aanroept als de query callback eindigt!
                    logger.debug('beforeEach done')
                    done()
                }
            )
        })
    })

    /**
     * Hier starten de testcases
     */

    it('TC-303-1 Lijst van maaltijden geretourneerd', (done) => {
        chai.request(server)
            .get(endpointToTest)
            .end((err, res) => {
                res.should.have.status(200)
                res.body.should.be.a('object')
                res.body.should.have.property('message').eql('Meals found')
                done()
            })
    })
})

describe('UC-304 Opvragen van maaltijd bij ID', () => {
    /**
     * Voorbeeld van een beforeEach functie.
     * Hiermee kun je code hergebruiken of initialiseren.
     */
    beforeEach((done) => {
        logger.debug('beforeEach called')
        // maak de testdatabase leeg zodat we onze testen kunnen uitvoeren.
        db.getConnection(function (err, connection) {
            if (err) throw err // not connected!

            // Use the connection
            connection.query(
                CLEAR_DB + INSERT_USER + INSERT_MEALS,
                function (error, results, fields) {
                    // When done with the connection, release it.
                    connection.release()

                    // Handle error after the release.
                    if (error) throw error
                    // Let op dat je done() pas aanroept als de query callback eindigt!
                    logger.debug('beforeEach done')
                    done()
                }
            )
        })
    })

    /**
     * Hier starten de testcases
     */
    describe('TC-304-1 Maaltijd bestaat niet', () => {
        it('should return a not found error message', (done) => {
            chai.request(server)
                .get(endpointToTest + '/999') // Ensure correct endpoint
                .end((err, res) => {
                    res.should.have.status(404)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('meal bestaat niet')
                    done()
                })
        })
    })

    describe('TC-304-2 Details van maaltijd geretourneerd', () => {
        it('should return a success message and meal data', (done) => {
            chai.request(server)
                .get(endpointToTest + '/1') // Ensure correct endpoint
                .end((err, res) => {
                    res.should.have.status(200)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('Found 1 meal.')
                    res.body.should.have.property('data').which.is.an('array')
                    res.body.data[0].should.have.property('id').eql(1)
                    res.body.data[0].should.have.property('isActive')
                    res.body.data[0].should.have.property('isVega')
                    res.body.data[0].should.have.property('isVegan')
                    res.body.data[0].should.have.property('isToTakeHome')
                    res.body.data[0].should.have.property('dateTime')
                    res.body.data[0].should.have.property(
                        'maxAmountOfParticipants'
                    )
                    res.body.data[0].should.have.property('price')
                    res.body.data[0].should.have.property('imageUrl')
                    res.body.data[0].should.have.property('cookId')
                    res.body.data[0].should.have.property('createDate')
                    res.body.data[0].should.have.property('updateDate')
                    res.body.data[0].should.have.property('updateDate')
                    res.body.data[0].should.have.property('name')
                    res.body.data[0].should.have.property('description')
                    res.body.data[0].should.have.property('allergenes')
                    done()
                })
        })
    })
})

describe('UC-305 Verwijderen van maaltijd', () => {
    const token = jwt.sign({ userId: 1 }, jwtSecretKey)
    const notToken = jwt.sign({ userId: 2 }, jwtSecretKey)
    beforeEach((done) => {
        logger.debug('beforeEach called')
        // maak de testdatabase leeg zodat we onze testen kunnen uitvoeren.
        db.getConnection(function (err, connection) {
            if (err) throw err // not connected!

            // Use the connection
            connection.query(
                CLEAR_DB + INSERT_USER + INSERT_MEALS,
                function (error, results, fields) {
                    // When done with the connection, release it.
                    connection.release()

                    // Handle error after the release.
                    if (error) throw error
                    // Let op dat je done() pas aanroept als de query callback eindigt!
                    logger.debug('beforeEach done')
                    done()
                }
            )
        })
    })

    describe('TC-305-1 Niet ingelogd', () => {
        it('should return an error message', (done) => {
            chai.request(server)
                .delete(endpointToTest + '/1') // Ensure correct endpoint
                .set('Authorization', `Bearer invalid_token`)
                .end((err, res) => {
                    res.should.have.status(401)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('Not authorized!')
                    done()
                })
        })
    })

    describe('TC-305-2 Niet de eigenaar van de data', () => {
        it('should return a forbidden error message', (done) => {
            chai.request(server)
                .delete(endpointToTest + '/2') // Ensure correct endpoint
                .set('Authorization', `Bearer ${notToken}`)
                .end((err, res) => {
                    res.should.have.status(403)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('Je bent niet de eigenaar van de data')
                    done()
                })
        })
    })

    describe('TC-305-3 Maaltijd bestaat niet', () => {
        it('should return a error message', (done) => {
            chai.request(server)
                .delete(endpointToTest + '/999') // Ensure correct endpoint
                .set('Authorization', `Bearer ${token}`)
                .end((err, res) => {
                    res.should.have.status(404)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('Meal not found')
                    done()
                })
        })
    })

    describe('TC-305-4 Maaltijd succesvol verwijderd', () => {
        it('should delete the meal successfully', (done) => {
            // First create a meal to ensure there is a meal to delete
            chai.request(server)
                .delete(endpointToTest + '/1') // Ensure correct endpoint
                .set('Authorization', 'Bearer ' + token)
                .end((err, res) => {
                    res.should.have.status(200)
                    res.body.should.have.property('message')
                    res.body.message.should.equal('Meal with id 1 deleted.')
                    done()
                })
        })
    })
})
