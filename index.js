import puppeteer from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = 3000;

puppeteer.use(stealthPlugin());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

import { executablePath } from "puppeteer";

// const url = "https://books.toscrape.com/";
// const url = "https://bot.sannysoft.com/";

const get_product_links = async (browser, url) => {
  const page = await browser.newPage();
  await page.goto(url);
  await page.screenshot({ path: "search.jpg", fullPage: true });

  const product_links = await page.evaluate(() => {
    let data = Array.from(
      document.querySelectorAll(".s-title-instructions-style")
    );

    let links = data.map((prod) => ({
      link: prod.querySelector("h2 a").getAttribute("href"),
      title: prod.querySelector("h2 a span").innerText,
    }));

    return links;
  });

  return product_links;
};

// '/Apple-iPhone-13-128GB-Midnight/product-reviews/B09G9HD6PD/ref=cm_cr_dp_d_show_all_btm?ie=UTF8&reviewerType=all_reviews'

const get_product_review_links = async (browser, product_links) => {
  let product_review_links = [];

  console.log(product_links.length);

  for (let i = 0; i < product_links.length; i++) {
    let temp = "https://amazon.in";
    let end = "ref=cm_cr_dp_d_show_all_btm?ie=UTF8&reviewerType=all_reviews";
    let curr = product_links[i].link;

    if (curr[0] == "/") {
      if (curr.substr(0, 5) == "/sspa") {
        let count = 0;

        for (let j = 0; j < curr.length; j++) {
          if (curr[j] == "%") {
            count += 1;
            j += 3;
            temp += "/";
          }
          if (count == 4) break;

          if (count == 2) {
            temp += "product-reviews";
            j += 1;
            continue;
          }

          if (count > 0) temp += curr[j];
        }
      } else {
        let count = 0;
        for (let j = 0; j < curr.length; j++) {
          if (curr[j] == "/") count += 1;

          if (count == 2) {
            temp += "/product-reviews";
            j += 2;
            continue;
          }

          temp += curr[j];

          if (count == 4) break;
        }
      }
    } else {
      let count = 0;

      for (let j = 0; j < curr.length; j++) {
        if (curr[j] == "/") count += 1;

        if (count == 10) {
          temp += "/product-reviews";
          j += 2;
          continue;
        }

        if (count >= 9) temp += curr[j];

        if (count == 12) break;
      }
    }

    temp += end;

    // console.log("i = ", i);
    // console.log("Curr = ", curr);
    // console.log("temp = ", temp);

    product_review_links.push(temp);
  }

  return product_review_links;
};

const get_reviews = async (browser, product_review_links) => {
  let reviews = [];

  for (let j = 0; j < 5; j++) {
    let url = product_review_links[j];

    console.log("j = ", j);
    console.log("url = ", url);

    let curr = {};
    let i = 0;

    const page = await browser.newPage();

    while (i < 3) {
      await page.goto(url, { timeout: 0 });
      await page.screenshot({ path: `page${i}.jpg`, fullPage: true });

      const bookData = await page.evaluate((url) => {
        const reviewsHTML = Array.from(
          document.querySelectorAll(".review-text-content")
        );

        const reviews = reviewsHTML.map((review) => ({
          review:
            review.querySelector("span") == null
              ? "null"
              : review.querySelector("span").innerHTML,
        }));

        let nextUrl = "https://www.amazon.in";

        nextUrl +=
          document.querySelector(".a-last a") == null
            ? "/null"
            : document.querySelector(".a-last a").getAttribute("href");

        const data = {
          title: document.querySelector(".product-title h1 a").innerText + ",",
          nextUrl: nextUrl,
          reviews: reviews,
        };

        return data;
      }, url);

      // console.log(bookData);

      if (i == 0) {
        // fs.writeFile(`data.json`, JSON.stringify(bookData), (err) => {
        //   if (err) throw err;
        //   console.log("Successfully saved JSON!");
        // });

        curr = bookData;
      } else {
        // fs.readFile("data.json", (err, data) => {
        //   if (err) throw err;

        //   let old_data = JSON.parse(data);

        //   let old_reviews = old_data.reviews;

        //   let updated_reviews = old_reviews.concat(bookData.reviews);

        //   old_data.reviews = updated_reviews;

        //   fs.writeFile(`data.json`, JSON.stringify(old_data), (err) => {
        //     if (err) throw err;
        //     console.log("Successfully saved JSON!");
        //   });
        // });

        let prev_rev = curr.reviews;
        let updated_reviews = prev_rev.concat(bookData.reviews);

        curr.reviews = updated_reviews;
      }

      url = bookData.nextUrl;

      if (url == "https://www.amazon.in/null") break;

      i++;
    }

    reviews.push(curr);
  }

  return reviews;
};

const main = async (search_term) => {
  let edited_search_term = search_term.toLowerCase();
  edited_search_term = edited_search_term.replace(" ", "+");

  let url = "https://www.amazon.in/s?k=" + edited_search_term;

  console.log("URL : ", url);

  let result;

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath(),
  });

  let i = 0;

  let product_links = await get_product_links(browser, url);

  // console.log(product_links);

  let product_review_links = await get_product_review_links(
    browser,
    product_links
  );

  // console.log(product_review_links);

  let reviews = await get_reviews(browser, product_review_links);

  // console.log(reviews);
  result = reviews;

  // fs.writeFile(`data.json`, JSON.stringify(reviews), (err) => {
  //   if (err) throw err;
  //   console.log("Successfully saved JSON!");
  // });

  await browser.close();

  return result;
};

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.post("/search", async (req, res) => {
  const search_term = req.body.search;

  console.log(search_term);

  let reviews = await main(search_term);

  res.render("index.ejs", { result: reviews });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
