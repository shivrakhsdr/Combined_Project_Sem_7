import puppeteer from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import express from "express";
import bodyParser from "body-parser";
import scrapper from "./amazonScrapper.js";
import { executablePath } from "puppeteer";

const app = express();
const port = 3000;

puppeteer.use(stealthPlugin());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.post("/search", async (req, res) => {
  const search_term = req.body.search;

  console.log(search_term);

  let result = await scrapper(search_term);

  res.render("index.ejs", { result: result });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

