module.exports = {
    apps: [
        {
            name: "UZA-Admin-Api(.env.staging)",
            script: "./app.js",
            watch: true,
            env: {
                "PORT": 1303,
                "NODE_ENV": "staging"
            }
        }
    ]
}
