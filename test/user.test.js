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

const endpointToTest = '/api/user'
const endpointToTestProfile = '/api/user/profile'

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
    "(2, 'Meal B', 'description', 'image url', NOW(), 0, 6.50, 2);"

describe('UC-101: Inloggen', () => {
    // TC-101-1: Verplicht veld ontbreekt

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

    it('TC-101-1 Verplicht veld ontbreekt - email is verplicht', (done) => {
        chai.request(server)
            .post('/api/login')
            .send({ password: 'secret' })
            .end((err, res) => {
                expect(res).to.have.status(400)
                expect(res.body)
                    .to.have.property('message')
                    .eql(
                        'AssertionError [ERR_ASSERTION]: email is required and must be a string.'
                    )
                done()
            })
    })

    // TC-101-2: Niet-valide wachtwoord
    it('TC-101-2 Niet-valide wachtwoord', (done) => {
        chai.request(server)
            .post('/api/login')
            .send({
                emailAdress: 'name@server.nl',
                password: 'wrongpassword'
            })
            .end((err, res) => {
                expect(res).to.have.status(400)
                expect(res.body)
                    .to.have.property('message')
                    .eql('Password invalid')
                done()
            })
    })

    // TC-101-3: Gebruiker bestaat niet
    it('TC-101-3 Gebruiker bestaat niet', (done) => {
        chai.request(server)
            .post('/api/login')
            .send({
                emailAdress: 'nonexistent@example.com',
                password: 'password123'
            })
            .end((err, res) => {
                expect(res).to.have.status(404)
                expect(res.body)
                    .to.have.property('message')
                    .eql('User not found')
                done()
            })
    })

    // TC-101-4: Gebruiker succesvol ingelogd
    it('TC-101-4 Gebruiker succesvol ingelogd', (done) => {
        chai.request(server)
            .post('/api/login')
            .send({
                emailAdress: 'name@server.nl',
                password: 'secret'
            })
            .end((err, res) => {
                expect(res).to.have.status(200)
                expect(res.body)
                    .to.have.property('message')
                    .eql('User logged in')
                done()
            })
    })
})

describe('UC201 Registreren als nieuwe user', () => {
    /**
     * Voorbeeld van een beforeEach functie.
     * Hiermee kun je code hergebruiken of initialiseren.
     */
    beforeEach((done) => {
        console.log('Before each test')
        done()
    })

    /**
     * Hier starten de testcases
     */
    it('TC-201-1 Verplicht veld ontbreekt', (done) => {
        chai.request(server)
            .post(endpointToTest)
            .send({
                // firstName: 'Voornaam', ontbreekt
                lastName: 'Achternaam',
                emailAdress: 'v.a@server.nl'
            })
            .end((err, res) => {
                /**
                 * Voorbeeld uitwerking met chai.expect
                 */
                chai.expect(res).to.have.status(400)
                chai.expect(res).not.to.have.status(200)
                chai.expect(res.body).to.be.a('object')
                chai.expect(res.body).to.have.property('status').equals(400)
                chai.expect(res.body)
                    .to.have.property('message')
                    .equals('Missing or incorrect firstName field')
                chai
                    .expect(res.body)
                    .to.have.property('data')
                    .that.is.a('object').that.is.empty

                done()
            })
    })

    it('TC-201-2 Niet-valide emailadres', (done) => {
        chai.request(server)
            .post(endpointToTest)
            .send({
                firstName: 'Voornaam',
                lastName: 'Achternaam',
                emailAdress: 'v.aserver.nl' // Invalid email address
            })
            .end((err, res) => {
                chai.expect(res).to.have.status(400)
                chai.expect(res.body).to.be.a('object')
                chai.expect(res.body).to.have.property('status').equals(400)
                chai.expect(res.body)
                    .to.have.property('message')
                    .equals('Invalid email address')
                chai.expect(res.body.data).to.be.empty

                // Check that the user is not added to the system
                // You can use a separate function to check the database or API
                done()
            })
    })

    it('TC-201-3 Niet-valide wachtwoord', (done) => {
        chai.request(server)
            .post(endpointToTest)
            .send({
                firstName: 'Voornaam',
                lastName: 'Achternaam',
                emailAdress: 'v.a@server.nl',
                password: 'short' // Invalid password
            })
            .end((err, res) => {
                chai.expect(res).to.have.status(400)
                chai.expect(res.body).to.be.a('object')
                chai.expect(res.body).to.have.property('status').equals(400)
                chai.expect(res.body)
                    .to.have.property('message')
                    .equals('Password must be at least 8 characters long')
                chai.expect(res.body.data).to.be.empty

                // Check that the user is not added to the system
                // You can use a separate function to check the database or API
                done()
            })
    })

    it('TC-201-4 Gebruiker bestaat al', (done) => {
        chai.request(server)
            .post(endpointToTest)
            .send({
                firstName: 'Voornaam',
                lastName: 'Achternaam',
                emailAdress: 'name@server.nl', // Existing email address
                password: 'secret'
            })
            .end((err, res) => {
                chai.expect(res).to.have.status(403)
                chai.expect(res.body).to.be.a('object')
                chai.expect(res.body).to.have.property('status').equals(403)
                chai.expect(res.body)
                    .to.have.property('message')
                    .equals('User with this email address already exists')
                chai.expect(res.body.data).to.be.empty

                // Check that the user is not added to the system
                // You can use a separate function to check the database or API
                done()
            })
    })

    it('TC-201-5 Gebruiker succesvol geregistreerd', (done) => {
        chai.request(server)
            .post(endpointToTest)
            .send({
                firstName: 'Voornaam',
                lastName: 'Achternaam',
                emailAdress: 'dayal@server.nl',
                password: 'Secret12'
            })
            .end((err, res) => {
                res.should.have.status(200)
                res.body.should.be.a('object')

                res.body.should.have.property('data').that.is.a('object')
                res.body.should.have.property('message').that.is.a('string')

                const data = res.body.data
                data.should.have.property('firstName').equals('Voornaam')
                data.should.have.property('lastName').equals('Achternaam')
                data.should.have.property('emailAdress')
                data.should.have.property('id').that.is.a('number')

                done()
            })
    })
})

describe('UC-202 Opvragen van overzicht van users', () => {
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
                CLEAR_DB + INSERT_USER + INSERT_USER2,
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

    it('TC-202-1 Toon alle gebruikers (minimaal 2)', (done) => {
        chai.request(server)
            .get(endpointToTest)
            .end((err, res) => {
                res.should.have.status(200)
                res.body.should.be.a('object')
                res.body.should.have.property('message').eql('Users found')
                res.body.should.have.property('data').with.lengthOf.at.least(2)
                done()
            })
    })

    it('TC-202-2 Toon gebruikers met zoekterm op niet-bestaande velden', (done) => {
        chai.request(server)
            .get(
                `${endpointToTest}?firstName=Tim&lastName=Van Tuinen&isActive=0`
            )
            .end((err, res) => {
                res.should.have.status(200)
                res.body.should.be.a('object')
                res.body.should.have.property('message').eql('No users found')
                res.body.should.have.property('data').with.lengthOf(0)
                done()
            })
    })

    it('TC-202-3 Toon gebruikers met gebruik van de zoekterm op het veld `isActive`=false', (done) => {
        chai.request(server)
            .get(
                `${endpointToTest}?firstName=firstName&lastName=lastName&isActive=0`
            )
            .end((err, res) => {
                res.should.have.status(200)
                res.body.should.be.a('object')
                res.body.should.have.property('message').eql('No users found')
                done()
            })
    })

    it('TC-202-4 Toon gebruikers met gebruik van de zoekterm op het veld `isActive`=true', (done) => {
        chai.request(server)
            .get(
                `${endpointToTest}?firstName=firstName&lastName=lastName&isActive=1`
            )
            .end((err, res) => {
                res.should.have.status(200)
                res.body.should.be.a('object')
                res.body.should.have.property('message').eql('Users found')
                res.body.should.have.property('data').with.lengthOf.at.least(1)
                done()
            })
    })

    it('TC-202-5 Toon gebruikers met zoektermen op bestaande velden (maximaal 2 velden filteren)', (done) => {
        chai.request(server)
            .get(`${endpointToTest}?firstName=first&lastName=last&isActive=1`)
            .end((err, res) => {
                res.should.have.status(200)
                res.body.should.be.a('object')
                res.body.should.have.property('message').eql('Users found')
                res.body.should.have.property('data').with.lengthOf.at.least(1)
                done()
            })
    })
})

describe('UC-203 Opvragen van gebruikersprofiel', () => {
    const token = jwt.sign({ userId: 1 }, jwtSecretKey)
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
                CLEAR_DB + INSERT_USER + INSERT_USER2,
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

    describe('TC-203-1 Ongeldig token', () => {
        it('should return an error message', (done) => {
            chai.request(server)
                .get(`${endpointToTestProfile}`)
                .set(
                    'Authorization',
                    'Bearer eyJ1c2VySWQiOjEsImlhdCI6MTcxNTcwMTY0MSwiZXhwIjoxNzE2NzM4NDQxfQ'
                )
                .end((err, res) => {
                    res.should.have.status(401)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('Not authorized!')
                    done()
                })
        })

        it('should return an error message for an expired token', (done) => {
            chai.request(server)
                .get(`${endpointToTestProfile}`)
                .set(
                    'Authorization',
                    'Bearer eyJ1c2VySWQiOjEsImlhdCI6MTcxNTcwMTY0MSwiZXhwIjoxNzE2NzM4NDQxfQ'
                )
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

    describe('TC-203-2 Gebruiker is ingelogd met geldig token', () => {
        it('should return a success message and user data', (done) => {
            chai.request(server)
                .get(`${endpointToTestProfile}`)
                .set('Authorization', `Bearer ${token}`)
                .end((err, res) => {
                    res.should.have.status(200)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('Found 1 user.')
                    done()
                })
        })
    })
})

describe('UC-204 Opvragen van usergegevens bij ID', () => {
    const token = jwt.sign({ userId: 1 }, jwtSecretKey)
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
                CLEAR_DB + INSERT_USER + INSERT_USER2,
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

    describe('TC-204-1 Ongeldig token', () => {
        it('should return an error message', (done) => {
            chai.request(server)
                .get(endpointToTest + '/1') // Ensure correct endpoint
                .set('Authorization', 'Bearer xdcfvghjkjhgfd')
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

    describe('TC-204-2 Gebruiker-ID bestaat niet', () => {
        it('should return a not found error message', (done) => {
            chai.request(server)
                .get(endpointToTest + '/9999') // Ensure correct endpoint
                .set('Authorization', `Bearer ${token}`)
                .end((err, res) => {
                    res.should.have.status(404)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('Gebruiker-ID bestaat niet')
                    done()
                })
        })
    })

    describe('TC-204-3 Gebruiker-ID bestaat', () => {
        it('should return a success message and user data', (done) => {
            chai.request(server)
                .get(endpointToTest + '/1') // Ensure correct endpoint
                .set('Authorization', `Bearer ${token}`)
                .end((err, res) => {
                    res.should.have.status(200)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('Found 1 user.')
                    res.body.should.have.property('data').which.is.an('array')
                    res.body.data[0].should.have.property('id').eql(1)
                    res.body.data[0].should.have.property('firstName')
                    res.body.data[0].should.have.property('lastName')
                    res.body.data[0].should.have.property('isActive')
                    done()
                })
        })
    })
})

describe('UC-205 Updaten van usergegevens', () => {
    const token = jwt.sign({ userId: 1 }, jwtSecretKey)
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
                CLEAR_DB + INSERT_USER + INSERT_USER2,
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

    describe('TC-205-1 Verplicht veld “emailAddress” ontbreekt', () => {
        it('should return a bad request error message', (done) => {
            chai.request(server)
                .put(endpointToTest + '/1') // Ensure correct endpoint
                .set('Authorization', `Bearer ${token}`)
                .send({
                    firstName: 'New',
                    lastName: 'User',
                    phoneNumber: '0987654321'
                })
                .end((err, res) => {
                    res.should.have.status(400)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('Verplicht veld “emailAddress” ontbreekt')
                    done()
                })
        })
    })

    describe('TC-205-2 De gebruiker is niet de eigenaar van de data', () => {
        it('should return a forbidden error message', (done) => {
            chai.request(server)
                .put(endpointToTest + '/2') // Ensure correct endpoint
                .set('Authorization', `Bearer ${token}`)
                .send({
                    firstName: 'New',
                    lastName: 'User',
                    emailAddress: 'newuser@example.com',
                    phoneNumber: '0987654321'
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

    describe('TC-205-3 Niet-valide telefoonnummer', () => {
        it('should return a bad request error message', (done) => {
            chai.request(server)
                .put(endpointToTest + '/1') // Ensure correct endpoint
                .set('Authorization', `Bearer ${token}`)
                .send({
                    firstName: 'Mark',
                    lastName: 'Van Dam',
                    emailAdress: 'mvd.vandam@server.nl',
                    password: 'secret',
                    isActive: 'false',
                    street: 'Lovensdijkstraat',
                    city: 'Breda',
                    phoneNumber: '06 jjj',
                    roles: 'editor,guest'
                })
                .end((err, res) => {
                    res.should.have.status(400)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('PhoneNumber must only contain numbers')
                    done()
                })
        })
    })

    describe('TC-205-4 Gebruiker bestaat niet', () => {
        it('should return a error message', (done) => {
            chai.request(server)
                .put(endpointToTest + '/999') // Ensure correct endpoint
                .set('Authorization', `Bearer ${token}`)
                .end((err, res) => {
                    res.should.have.status(404)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('User not found')
                    done()
                })
        })
    })

    describe('TC-205-5 Niet ingelogd', () => {
        it('should return an error message', (done) => {
            chai.request(server)
                .put(endpointToTest + '/1') // Ensure correct endpoint
                .set(
                    'Authorization',
                    'Bearer eyJ1c2VySWQiOjEsImlhdCI6MTcxNTcwMTY0MSwiZXhwIjoxNzE2NzM4NDQxfQ'
                )
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

    describe('TC-205-6 Gebruiker succesvol gewijzigd', () => {
        it('should update the user', (done) => {
            chai.request(server)
                .put(endpointToTest + '/1') // Ensure correct endpoint
                .set('Authorization', `Bearer ${token}`)
                .send({
                    firstName: 'Mark',
                    lastName: 'Van Dam',
                    emailAdress: 'mvd.vandam@server.b.c.d.nl',
                    password: 'secret',
                    isActive: 'false',
                    street: 'Lovensdijkstraat',
                    city: 'Breda',
                    phoneNumber: '06 25897745',
                    roles: 'editor,guest'
                })
                .end((err, res) => {
                    res.should.have.status(200)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('User updated with id 1.')
                    done()
                })
        })
    })
})

describe('UC-206 Verwijderen van user', () => {
    const token = jwt.sign({ userId: 1 }, jwtSecretKey)
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
                CLEAR_DB + INSERT_USER + INSERT_USER2,
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

    describe('TC-206-1 Gebruiker bestaat niet', () => {
        it('should return a error message', (done) => {
            chai.request(server)
                .delete(endpointToTest + '/9999') // Ensure correct endpoint
                .set('Authorization', `Bearer ${token}`)
                .end((err, res) => {
                    res.should.have.status(404)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('User not found')
                    done()
                })
        })
    })

    describe('TC-206-2 Gebruiker is niet ingelogd', () => {
        it('should return an error message', (done) => {
            chai.request(server)
                .delete(endpointToTest + '/1') // Ensure correct endpoint
                .set(
                    'Authorization',
                    'Bearer eyJ1c2VySWQiOjEsImlhdCI6MTcxNTcwMTY0MSwiZXhwIjoxNzE2NzM4NDQxfQ'
                )
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

    describe('TC-206-3 De gebruiker is niet de eigenaar van de data', () => {
        it('should return a forbidden error message', (done) => {
            chai.request(server)
                .delete(endpointToTest + '/2') // Ensure correct endpoint
                .set('Authorization', `Bearer ${token}`)
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

    describe('TC-206-4 Gebruiker succesvol verwijderd', () => {
        it('should delete the user', (done) => {
            chai.request(server)
                .delete(endpointToTest + '/1') // Ensure correct endpoint
                .set('Authorization', `Bearer ${token}`)
                .end((err, res) => {
                    res.should.have.status(200)
                    res.body.should.be.a('object')
                    res.body.should.have
                        .property('message')
                        .eql('User with id 1 deleted.')
                    done()
                })
        })
    })
})
