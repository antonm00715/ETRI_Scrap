var express = require("express");
var bodyParser = require("body-parser");
var R = require("ramda");
const axios = require("axios").default;
const axiosCookieJarSupport = require("axios-cookiejar-support").default;
const tough = require("tough-cookie");
var fs = require("fs");
var app = express();
var path = require("path");
const util = require("util");
const cheerio = require("cheerio");
axiosCookieJarSupport(axios);
const cookieJar = new tough.CookieJar();
const { downloadData } = require("./data");
var PORT = 3001;
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.listen(PORT, async function () {
  console.log("Listening on port " + PORT);
  downloads();
});

async function getHtmlFile(url) {
  try {
    return await axios.get(url, {
      jar: cookieJar, // tough.CookieJar or boolean
      withCredentials: true, // If true, send cookie stored in jar
    });
  } catch (error) {
    console.log(error);
    return null;
  }
}
async function GetData(html) {
  try {
    let $ = cheerio.load(html);
    const pdf_url = $("iframe").attr("src");
    return pdf_url;
  } catch (error) {
    return null;
  }
}

async function downloads() {
  for (const downloadItem of downloadData) {
    try {
      const resHtml = await getHtmlFile(downloadItem.link);
      if (resHtml.data) {
        const pdfURL = await GetData(resHtml.data);
        if (pdfURL) {
          console.log("pdf url", pdfURL);
          try {
            const downloaded = await DownLoadPDF(pdfURL, downloadItem.title);
            if (downloaded === true) {
              console.log("downloaded ", downloadItem);
            } else {
              console.log("downloaded error", downloaded);
            }
          } catch (error) {
            console.log("error", error);
          }
        }
      }
    } catch (error) {
      console.log("download error", error);
    }
  }
}

async function DownLoadPDF(url, name) {
  const name_str = name.replace(/[^a-zA-Z ]/g, "");
  const filepath = path.resolve(__dirname, "downloads", `${name_str}.pdf`);
  const writer = fs.createWriteStream(filepath);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });
  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    let error = null;
    writer.on("error", (err) => {
      error = err;
      console.log("error", error);
      writer.close();
      reject(err);
    });
    writer.on("close", () => {
      if (!error) {
        resolve(true);
      }
      //no need to call the reject here, as it will have been called in the
      //'error' stream;
    });
  });
}
