const axios = require("axios");
const express = require("express");
const router = express.Router();

const getGeocodingLatLong = async ({ input }) => {
  const geocodingOneLineAddressURL = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?format=json&benchmark=2020&address=${input}`;

  const geocoding = await axios.get(geocodingOneLineAddressURL);

  const geocodingData = geocoding.data.result;

  const lat = geocodingData?.addressMatches[0]?.coordinates?.y;
  const long = geocodingData?.addressMatches[0]?.coordinates?.x;

  return { lat, long };
};

const getWeatherPoints = async ({ lat, long }) => {
  const weatherPointsURL = `https://api.weather.gov/points/${lat},${long}`;

  const weatherPoints = await axios.get(weatherPointsURL);
  return weatherPoints.data.properties;
};

const getWeatherForecast = async ({ gridX, gridY, gridId }) => {
  const weatherForecastURL = `https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}/forecast/`;

  const weatherDays = await axios.get(weatherForecastURL);

  return weatherDays?.data?.properties?.periods;
};

const getWeatherForecastHourly = async ({ gridX, gridY, gridId }) => {
  const weatherForecastHourlyURL = `https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}/forecast/hourly`;

  const weatherHours = await axios.get(weatherForecastHourlyURL);

  return weatherHours?.data?.properties?.periods;
};

const getGroupsByDay = (weatherDaysData) => {
  return weatherDaysData.reduce((groups, weather) => {
    const date = weather.startTime.split("T")[0];

    groups[date] = groups[date] ?? [];
    groups[date].push(weather);
    return groups;
  }, {});
};

const getGroupsByHours = (weatherHoursData) => {
  return weatherHoursData.reduce((groups, weather) => {
    const date = weather.startTime.split("T")[0];

    groups[date] = groups[date] ?? [];
    groups[date].push(weather);
    return groups;
  }, {});
};

const getGroupDayArrays = ({ weatherDaysData, weatherHoursData }) => {
  const groupsByDay = getGroupsByDay(weatherDaysData);
  const groupsHours = getGroupsByHours(weatherHoursData);

  return Object.keys(groupsByDay).map((date) => {
    return {
      date,
      icon: groupsByDay[date][0]?.icon,
      max: groupsByDay[date][0]?.temperature,
      min: groupsByDay[date][1]?.temperature,
      shortForecast: groupsByDay[date][0]?.shortForecast,
      detailedForecast: groupsByDay[date][0]?.detailedForecast,
      temperatureUnit: groupsByDay[date][0]?.temperatureUnit,
      windDirection: groupsByDay[date][0]?.windDirection,
      windSpeed: groupsByDay[date][0]?.windSpeed,
      isDaytime:
        groupsByDay[date][0]?.isDaytime ||
        groupsByDay[date][1]?.isDaytime ||
        false,
      isDayComplete: !!groupsByDay[date][0] && !!groupsByDay[date][1],
      byHour: groupsHours[date],
    };
  });
};

const getWeatherData = async ({ input }) => {
  const geocodingData = await getGeocodingLatLong({ input });

  const weatherPointsData = await getWeatherPoints({
    lat: geocodingData?.lat,
    long: geocodingData?.long,
  });

  const weatherDaysData = await getWeatherForecast({
    gridX: weatherPointsData?.gridX,
    gridY: weatherPointsData?.gridY,
    gridId: weatherPointsData?.gridId,
  });

  const weatherHoursData = await getWeatherForecastHourly({
    gridX: weatherPointsData?.gridX,
    gridY: weatherPointsData?.gridY,
    gridId: weatherPointsData?.gridId,
  });

  const groupDayArrays = getGroupDayArrays({
    weatherDaysData,
    weatherHoursData,
  });

  return groupDayArrays;
};

router.get("/", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  try {
    const data = await getWeatherData({
      input: req.query.address,
    });

    res.json(data);
  } catch (err) {
    console.error(err.message);

    res.status(500).send("Server Error");
  }
});

module.exports = router;
