# Nodejs Programmeren 4 Express server


## Installing

To install, run `npm install`.

## Running

To run the server in your local development environment, type `npm run dev`.

## Functions

UC-101 Inloggen 

POST /api/login

UC-102 Opvragen van systeeminformatie 

GET /api/info

UC-201 Registreren als nieuwe user 

POST /api/user 

UC-202 Opvragen van overzicht van users 

GET /api/user 

UC-202 Opvragen van overzicht van users 

GET /api/user?field1=:value1&field2=:value2

UC-203 Opvragen van gebruikersprofiel 

GET /api/user/profile

UC-204 Opvragen van usergegevens bij ID 

GET /api/user/:userId

UC-205 Wijzigen van usergegevens 

PUT /api/user/:userId 

UC-206 Verwijderen van user 

DELETE /api/user/:userId .

UC-301 Toevoegen van maaltijden 

POST /api/ meal

UC-302 Wijzigen van maaltijd 

PUT /api/ meal/:mealId

UC-303 Opvragen van alle maaltijden 

GET /api/meal 

UC-304 Opvragen van maaltijd bij ID 

GET /api/meal/:mealId

UC-305 Verwijderen van maaltijd 

DELETE /api/meal/:mealId
