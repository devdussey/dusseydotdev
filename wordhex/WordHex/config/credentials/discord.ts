type CredentialRecord = Record<string, string | undefined>

const required = (value: string | undefined, name: string) => {
	if (!value) {
		console.warn(`Missing credential ${name}; please set it in your .env file.`)
	}
	return value ?? ''
}

const credentials: CredentialRecord = {
	DISCORD_CLIENT_ID: required(process.env.DISCORD_CLIENT_ID, 'DISCORD_CLIENT_ID'),
	DISCORD_CLIENT_SECRET: required(process.env.DISCORD_CLIENT_SECRET, 'DISCORD_CLIENT_SECRET'),
	VITE_DISCORD_CLIENT_ID: required(process.env.VITE_DISCORD_CLIENT_ID, 'VITE_DISCORD_CLIENT_ID'),
	DISCORD_REDIRECT_URI: required(process.env.DISCORD_REDIRECT_URI, 'DISCORD_REDIRECT_URI'),
	PORT: process.env.PORT
}

export default credentials
