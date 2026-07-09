module.exports = {
    apps: [
        {
            name: "UZA-Admin-Api",
            script: "./app.js",
            watch: false,
            env: {
                "PORT": 1303,
                "NODE_ENV": "production",
            }
        }
    ]
}
