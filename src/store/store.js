import { configureStore } from '@reduxjs/toolkit';
import simScenarioReducer from './simScenarioSlice';
import simGroupReducer from './simGroupSlice';
import simDataReducer from './simDataSlice';
import simBookingReducer from './simBookingSlice';
import simQualificationReducer from './simQualificationSlice';
import simFinancialsReducer from './simFinancialsSlice';

const store = configureStore({
  reducer: {
    simScenario: simScenarioReducer,
    simGroup: simGroupReducer,
    simData: simDataReducer,
    simBooking: simBookingReducer,
    simQualification: simQualificationReducer,
    simFinancials: simFinancialsReducer,
    // ...add other reducers here...
  },
  // Redux DevTools enabled by default
});

export default store;
