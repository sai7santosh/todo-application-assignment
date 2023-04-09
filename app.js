const express = require("express");
const addDays = require("date-fns/addDays");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const isValid = require("date-fns/isValid");
const format = require("date-fns/format");

let db = null;
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "todoApplication.db");
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const statusValues = ["TO DO", "IN PROGRESS", "DONE"];
const priorityValues = ["HIGH", "MEDIUM", "LOW"];
const categoryValues = ["WORK", "HOME", "LEARNING"];

const verifyValues = (request, response, next) => {
  const givenObject = request.query;
  if (
    givenObject.priority !== undefined &&
    !priorityValues.includes(givenObject.priority)
  ) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (
    givenObject.status !== undefined &&
    !statusValues.includes(givenObject.status)
  ) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (
    givenObject.category !== undefined &&
    !categoryValues.includes(givenObject.category)
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    next();
  }
};

const verifyBody = (request, response, next) => {
  const givenBody = request.body;
  let { dueDate } = request.body;
  const isValidDate = isValid(new Date(dueDate));
  if (
    givenBody.priority !== undefined &&
    !priorityValues.includes(givenBody.priority)
  ) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (
    givenBody.status !== undefined &&
    !statusValues.includes(givenBody.status)
  ) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (
    givenBody.category !== undefined &&
    !categoryValues.includes(givenBody.category)
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (givenBody.dueDate !== undefined && !isValidDate) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    next();
  }
};

const convertDataListToResponseObject = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};

app.get("/todos/", verifyValues, async (request, response) => {
  let getTodoQuery = "";
  let dataList;

  const { search_q = "", priority, status, category } = request.query;

  let isStatusValid = statusValues.includes(status);
  let isPriorityValid = priorityValues.includes(priority);
  let isCategoryValid = categoryValues.includes(category);

  const hasPriorityAndStatusProperties = (requestQuery) => {
    return (
      requestQuery.priority !== undefined && requestQuery.status !== undefined
    );
  };

  const hasPriorityAndCategoryProperties = (requestQuery) => {
    return (
      requestQuery.priority !== undefined && requestQuery.category !== undefined
    );
  };

  const hasPriority = (requestQuery) => {
    return requestQuery.priority !== undefined;
  };

  const hasStatus = (requestQuery) => {
    return requestQuery.status !== undefined;
  };

  const hasCategory = (requestQuery) => {
    return requestQuery.category !== undefined;
  };

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getTodoQuery = `
            SELECT * FROM todo
            WHERE 
            todo LIKE '%${search_q}%'
            AND status = '${status}'
            AND priority = '${priority}';`;
      break;
    case hasPriorityAndCategoryProperties(request.query):
      getTodoQuery = `
        SELECT * FROM todo
        WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}'
        AND category = '${category}';`;
      break;
    case hasPriority(request.query):
      getTodoQuery = `
            SELECT * FROM todo
            WHERE
            todo LIKE '%${search_q}%'
            AND priority = '${priority}';`;
      break;
    case hasStatus(request.query):
      getTodoQuery = `
            SELECT * FROM todo
            WHERE
            todo LIKE '%${search_q}%'
            AND status = '${status}';`;
      break;
    case hasCategory(request.query):
      getTodoQuery = `
            SELECT * FROM todo
            WHERE
            todo LIKE '%${search_q}%'
            AND category = '${category}';`;
      break;

    default:
      getTodoQuery = `
            SELECT * FROM todo
            WHERE
            todo LIKE '%${search_q}%';`;
      break;
  }

  dataList = await db.all(getTodoQuery);
  response.send(
    dataList.map((eachObject) => convertDataListToResponseObject(eachObject))
  );
});

//Return a Specific Todo
app.get("/todos/:todoId/", verifyValues, async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT * FROM
    todo
    WHERE
    id = ${todoId};`;
  const todoResponse = await db.get(getTodoQuery);
  response.send(convertDataListToResponseObject(todoResponse));
});

//Create Todo
app.post("/todos/", verifyBody, async (request, response) => {
  const todoDetails = request.body;
  const { id, todo, priority, status, category, dueDate } = todoDetails;
  const date = format(new Date(dueDate), "yyyy-MM-dd");
  const createTodoQuery = `
    INSERT INTO
     todo (id,todo,priority,status,category,due_Date)
    VALUES (${id},
        '${todo}',
        '${priority}',
        '${status}',
        '${category}',
        '${date}');`;
  const dbResponse = await db.run(createTodoQuery);
  response.send("Todo Successfully Added");
});

//Get specific Todo with Date
app.get("/agenda/", verifyValues, async (request, response) => {
  let { date } = request.query;
  let data = null;
  let getTodoQuery = "";

  const isValidDate = isValid(new Date(date));

  if (isValidDate === true) {
    date = format(new Date(date), "yyyy-MM-dd");
    getTodoQuery = `
    SELECT * FROM
    todo
    WHERE 
    due_date = '${date}';`;
    data = await db.all(getTodoQuery);
    response.send(
      data.map((eachObject) => convertDataListToResponseObject(eachObject))
    );
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//Upadate todo
app.put(
  "/todos/:todoId/",
  verifyValues,
  verifyBody,
  async (request, response) => {
    const todoDetails = request.body;
    const { todoId } = request.params;
    let message = "";
    switch (true) {
      case todoDetails.status !== undefined:
        message = "Status";
        break;
      case todoDetails.priority !== undefined:
        message = "Priority";
        break;
      case todoDetails.todo !== undefined:
        message = "Todo";
        break;
      case todoDetails.category !== undefined:
        message = "Category";
        break;
      case todoDetails.dueDate !== undefined:
        message = "Due Date";
        break;
    }
    const getPreviousTodoQuery = `
    SELECT * FROM
    todo
    WHERE
    id = ${todoId};`;
    const previousTodo = await db.get(getPreviousTodoQuery);
    const {
      todo = previousTodo.todo,
      priority = previousTodo.priority,
      status = previousTodo.status,
      category = previousTodo.category,
      dueDate = previousTodo.due_date,
    } = request.body;
    const isValidDate = isValid(new Date(dueDate));
    if (isValidDate === true) {
      const updateTodoQuery = `
    UPDATE
    todo
    SET
    todo ='${todo}',
    priority = '${priority}',
    status = '${status}',
    category = '${category}',
    due_date = '${dueDate}'
    WHERE
    id = ${todoId};`;
      await db.run(updateTodoQuery);
      response.send(`${message} Updated`);
    } else {
      response.status(400);
      response.send(`Invalid ${message}`);
    }
  }
);

//Delete todo
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM todo
    WHERE
    id = ${todoId};`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});
module.exports = app;
