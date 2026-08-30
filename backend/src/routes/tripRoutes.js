import { Router } from 'express';
import tripController, { createTripSchema } from '../controllers/tripController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticateToken);

router.get('/active', tripController.getUserActiveTrips);
router.post('/', validate(createTripSchema), tripController.createTrip);
router.get('/:tripId', tripController.getTripDetails);
router.post('/:tripId/start', tripController.startTrip);
router.post('/:tripId/end', tripController.endTrip);
router.get('/:tripId/timeline', tripController.getTripTimeline);
router.get('/:tripId/stops', tripController.getTripStops);
router.get('/:tripId/locations', tripController.getTripLocations);
router.get('/:tripId/location-history', tripController.getTripLocationHistory);

export default router;
