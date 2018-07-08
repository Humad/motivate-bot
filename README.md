# Motivate Bot

[Live Web Version](https://motivate-bot.herokuapp.com/)

Motivate Bot is an application that sends motivational and/or wholesome text messages to its subscribers at regular intervals.

This application works with the Twilio API to send a text message to its subscribed users at regular user-defined intervals. 

This was initially meant to be a Facebook messenger bot but Facebook has not yet approved my application request. I decided to switch over to Twilio because it was faster. 

[My Medium article: Creating a motivational Facebook Messenger Bot using Node.js](https://medium.com/@humadvii/creating-a-motivational-facebook-messenger-bot-using-node-js-c50954e93347)

# How it works

Motivate bot relies on a server created using Node.js and Express. It communicates with a Mongo database to retrieve and update its users. It periodically checks if it is time to send a message to a certain subscribed users. It also handles messages from the users, updating their data accordingly.

I am using my custom [Quotes API](https://github.com/Humad/Quotes-API) to get random quotes to send to the subscribers.

# To-do
- Finish the iOS admin interface for admins to see subscribed users and send out mass messages.
- Allow users to add their own quotes restricted to only their account.





