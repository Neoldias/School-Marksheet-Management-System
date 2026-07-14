import mysql.connector


def connect():

    db = mysql.connector.connect(

        host="localhost",
        user="root",
        password="password",
        database="school_marksheet"

    )

    return db