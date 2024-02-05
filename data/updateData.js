/**
 * Loads environment variables from a .env file into process.env.
 * @returns {void}
 */
require("dotenv").config();

const csv = require("csvtojson");
const fs = require("fs");

/* Connecting to the MongoDB database. */
const { MongoClient, ServerApiVersion } = require("mongodb");
const credentials = process.env.CREDENTIALS;
const uri = `mongodb+srv://${credentials}@cluster0.yxe57eq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const { config } = require("../src/config");
const { getNodeVarsValues } = require("../src/getNodeVarsValues");

const { b64Encode, b64Decode } = require("../src/utils/b64EncodeAndDecode");
const { countNullElements } = require("./countNullElements");
const { jsonArrayFiltered } = require("../src/utils/jsonArrayFiltered");
const { updateIds } = require("../src/updateIds");
const loopItems = require("./loopItems");
const isThirdPartyServiceOK = require("../src/utils/thirdPartyStatus");
const { getMojoBoxOffice } = require("../src/getMojoBoxOffice");
const { fetchAndCheckItemCount } = require("../src/getAllocineItemsNumber");

async function checkStatus(service) {
  if (await isThirdPartyServiceOK(service.url)) {
    console.log(`${service.name}'s status is OK, continuing...`);
  } else {
    console.error(`${service.name}'s status is not OK. Aborting.`);
    process.exit(1);
  }
}

(async () => {
  await Promise.all([fetchAndCheckItemCount(1), fetchAndCheckItemCount(2), fetchAndCheckItemCount(3)]);
  console.log("----------------------------------------------------------------------------------------------------");

  for (let service of config.services) {
    await checkStatus(service);
  }
  console.log("----------------------------------------------------------------------------------------------------");

  if (getNodeVarsValues.item_type === "movie") {
    if (fs.existsSync("errors.log")) {
      try {
        fs.unlinkSync("errors.log");
        console.log("Errors log has been removed.");
        console.log("----------------------------------------------------------------------------------------------------");
      } catch (err) {
        console.error("There was an error:", err);
      }
    }
  }

  if (getNodeVarsValues.get_ids === "update_ids") updateIds();
  if (getNodeVarsValues.get_db === "no_update_db") process.exit(0);

  const database = client.db(config.dbName);
  const collectionData = database.collection(config.collectionName);

  const idsFilePath = getNodeVarsValues.item_type === "movie" ? config.filmsIdsFilePath : config.seriesIdsFilePath;
  console.log(`Ids file path to use: ${idsFilePath}`);

  const jsonArrayFromCSV = await csv().fromFile(idsFilePath);
  const jsonArray = !getNodeVarsValues.is_not_active || getNodeVarsValues.is_not_active === "active" ? jsonArrayFiltered(jsonArrayFromCSV) : jsonArrayFromCSV;
  const allTheMovieDbIds = jsonArray.map((item) => parseInt(item.THEMOVIEDB_ID));

  /**
   * If we are in the `update_ids` mode, we proceed to reset the `is_active` and `popularity`
   * fields for all documents in the collectionData that do not match the currently active items IDs.
   * Once the operation is complete, we log the number of documents that have been affected by this operation.
   *
   * The fields `is_active` and `popularity` for the active items are updated afterwards.
   */
  if (getNodeVarsValues.get_ids === "update_ids") {
    const resetIsActive = { $set: { is_active: false } };
    const resetPopularity = { $set: { "allocine.popularity": null, "imdb.popularity": null, mojo: null } };

    const filterQueryIsActive = { item_type: getNodeVarsValues.item_type, id: { $nin: allTheMovieDbIds } };

    await collectionData.updateMany(filterQueryIsActive, resetIsActive);
    await collectionData.updateMany(filterQueryIsActive, resetPopularity);

    console.log(`${allTheMovieDbIds.length} documents have been excluded from the is_active and popularity reset.`);
  }

  const index_to_start = getNodeVarsValues.index_to_start || 0;

  console.time("Duration");

  try {
    /* Printing out the value of each variable in the getNodeVarsValues object. */
    for (const [variable, value] of Object.entries(getNodeVarsValues)) {
      const variableValue = value ? value : "not set";
      console.log(`${variable}: ${variableValue}`);
    }

    const check_db_ids = getNodeVarsValues.check_db_ids;
    if (check_db_ids === "check") {
      let idFromFiles = [];
      jsonArrayFromCSV.forEach((element) => {
        idFromFiles.push(b64Encode(`${config.baseURLAllocine}${element.URL}`));
      });
      const allDbIdsArray = await collectionData
        .find({ item_type: getNodeVarsValues.item_type })
        .map((el) => {
          return el._id;
        })
        .toArray();
      const idsOnlyInDb = allDbIdsArray.filter((x) => !idFromFiles.includes(x));
      idsOnlyInDb.forEach((element) => {
        console.log(`${element}: ${b64Decode(element)}`);
      });
      process.exit(0);
    }

    const force = getNodeVarsValues.force === "force";

    const mojoBoxOfficeArray = getNodeVarsValues.skip_mojo === "skip_mojo" ? [] : await getMojoBoxOffice(getNodeVarsValues.item_type);

    const { newOrUpdatedItems } = await loopItems(
      collectionData,
      config,
      force,
      index_to_start,
      getNodeVarsValues.item_type,
      jsonArray,
      mojoBoxOfficeArray,
      getNodeVarsValues.skip_already_added_documents
    );
    await countNullElements(collectionData, newOrUpdatedItems);
  } catch (error) {
    throw new Error(`Global: ${error}`);
  } finally {
    await client.close();
  }

  console.timeEnd("Duration", `- ${jsonArray.length} elements imported.`);
})();
