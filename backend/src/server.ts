import cors from 'cors'
import express from 'express'
import morgan from 'morgan'
import { env } from './config/env'
import profileRoutes from './routes/profileRoutes'
import joinRequestRoutes from './routes/joinRequestRoutes'
import ridesRoutes from './routes/ridesRoutes'
import rideInviteRoutes from './routes/rideInviteRoutes'
import rideRequestRoutes from './routes/rideRequestRoutes'
import ratingRoutes from './routes/ratingRoutes'

const app = express()
const origins = env.corsOrigin.split(',').map(origin => origin.trim())

app.use(
  cors({
    origin: env.corsOrigin === '*' ? true : origins,
    credentials: true
  })
)
app.use(express.json())
app.use(morgan('dev'))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'boiler-rideshare-backend' })
})

app.use('/api/profiles', profileRoutes)
app.use('/api/join-requests', joinRequestRoutes)
app.use('/api/ride-requests', rideRequestRoutes)
app.use('/api/ride-invites', rideInviteRoutes)
app.use('/api/rides', ridesRoutes)
app.use('/api/ratings', ratingRoutes)

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.path} not found` })
})

const start = () => {
  app.listen(env.port, () => {
    console.log(`Backend listening on port ${env.port}`)
  })
}

start()
