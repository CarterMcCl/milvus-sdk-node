import { MilvusClient } from "../milvus/index";
import { GENERATE_NAME, IP } from "../const";
import { DataType } from "../milvus/types/Common";
import { generateInsertData } from "../utils";
import { InsertReq } from "../milvus/types/Data";
import { genCollectionParams, VECTOR_FIELD_NAME } from "../utils/test";
const milvusClient = new MilvusClient(IP);
const COLLECTION_NAME = GENERATE_NAME();

const test = async () => {
  await milvusClient.collectionManager.createCollection(
    genCollectionParams(COLLECTION_NAME, "4", DataType.FloatVector, false)
  );

  await milvusClient.partitionManager.createPartition({
    collection_name: COLLECTION_NAME,
    partition_name: "test",
  });

  const fields = [
    {
      isVector: true,
      dim: 4,
      name: VECTOR_FIELD_NAME,
    },
    {
      isVector: false,
      name: "age",
    },
  ];
  const vectorsData = generateInsertData(fields, 1000);

  const params: InsertReq = {
    collection_name: COLLECTION_NAME,
    fields_data: vectorsData,
    partition_name: "test",
  };

  const insertRes = await milvusClient.dataManager.insert(params);
  console.log(insertRes);

  const flushRes = await milvusClient.dataManager.flushSync({
    collection_names: [COLLECTION_NAME],
  });

  let entitiesCount =
    await milvusClient.collectionManager.getCollectionStatistics({
      collection_name: COLLECTION_NAME,
    });
  console.log("---- entity count ----", entitiesCount);

  const deleteRes = await milvusClient.dataManager.deleteEntities({
    collection_name: COLLECTION_NAME,
    expr: "age in [1,2,3,4]",
  });
  console.log(deleteRes);

  await milvusClient.dataManager.flushSync({
    collection_names: [COLLECTION_NAME],
  });

  entitiesCount = await milvusClient.collectionManager.getCollectionStatistics({
    collection_name: COLLECTION_NAME,
  });
  console.log("---- entity count ----", entitiesCount);

  // need load collection before search
  await milvusClient.collectionManager.loadCollectionSync({
    collection_name: COLLECTION_NAME,
  });

  let res = await milvusClient.partitionManager.getPartitionStatistics({
    collection_name: COLLECTION_NAME,
    partition_name: "test",
  });

  console.log("----- describe partition --- ", res);

  const queryData = await milvusClient.dataManager.query({
    collection_name: COLLECTION_NAME,
    expr: `age in [2,4,33,100]`,
    output_fields: ["age", VECTOR_FIELD_NAME],
  });
  console.log(queryData, queryData.data[1].age, queryData.data[1].vector_field);

  const res2 = await milvusClient.dataManager.calcDistance({
    op_left: {
      data_array: {
        dim: 4,
        float_vector: {
          data: [1, 1, 1, 1],
        },
      },
    },
    op_right: {
      data_array: {
        dim: 4,
        float_vector: {
          data: [1, 2, 13, 1],
        },
      },
    },
    params: [
      {
        key: "metric",
        value: "L2",
      },
    ],
  });
  console.log("--- calc distance ---", res2);
  await milvusClient.collectionManager.dropCollection({
    collection_name: COLLECTION_NAME,
  });
};

test();
