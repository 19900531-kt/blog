use actix_cors::Cors;
use actix_web::{web, App, HttpServer};
use async_graphql::{
    EmptySubscription, Object, Schema, SimpleObject, InputObject, ID, Scalar, ScalarType, Value,
};
use async_graphql_actix_web::{GraphQLRequest, GraphQLResponse};
use std::sync::{Arc, Mutex};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use serde::{Deserialize, Serialize};

// DateTimeスカラー型
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct DateTimeScalar(DateTime<Utc>);

#[Scalar]
impl ScalarType for DateTimeScalar {
    fn parse(value: Value) -> async_graphql::InputValueResult<Self> {
        if let Value::String(s) = value {
            let dt = DateTime::parse_from_rfc3339(&s)
                .map_err(|_| async_graphql::InputValueError::custom("Invalid DateTime format"))?
                .with_timezone(&Utc);
            Ok(DateTimeScalar(dt))
        } else {
            Err(async_graphql::InputValueError::expected_type(value))
        }
    }

    fn to_value(&self) -> Value {
        Value::String(self.0.to_rfc3339())
    }
}

// データモデル
#[derive(Clone, SimpleObject)]
struct User {
    id: ID,
    name: String,
    #[graphql(name = "avatarUrl")]
    avatar_url: Option<String>,
}

#[derive(Clone, SimpleObject)]
struct Post {
    id: ID,
    title: String,
    author: User,
    body: String,
    tags: Vec<String>,
    published_at: DateTimeScalar,
}

#[derive(InputObject)]
struct CreatePostInput {
    title: String,
    body: String,
    tags: Option<Vec<String>>,
    author_id: ID,
}

// メモリストア
type UserStore = Arc<Mutex<Vec<User>>>;
type PostStore = Arc<Mutex<Vec<Post>>>;

// GraphQL Query
struct Query;

#[Object]
impl Query {
    async fn posts(&self, ctx: &async_graphql::Context<'_>) -> Vec<Post> {
        let post_store = ctx.data_unchecked::<PostStore>();
        let posts = post_store.lock().unwrap();
        posts.clone()
    }

    async fn post(&self, ctx: &async_graphql::Context<'_>, id: ID) -> Option<Post> {
        let post_store = ctx.data_unchecked::<PostStore>();
        let posts = post_store.lock().unwrap();
        posts.iter().find(|p| p.id == id).cloned()
    }

    async fn user(&self, ctx: &async_graphql::Context<'_>, id: ID) -> Option<User> {
        let user_store = ctx.data_unchecked::<UserStore>();
        let users = user_store.lock().unwrap();
        users.iter().find(|u| u.id == id).cloned()
    }
}

// GraphQL Mutation
struct Mutation;

#[Object]
impl Mutation {
    async fn create_post(
        &self,
        ctx: &async_graphql::Context<'_>,
        input: CreatePostInput,
    ) -> async_graphql::Result<Post> {
        let user_store = ctx.data_unchecked::<UserStore>();
        let post_store = ctx.data_unchecked::<PostStore>();

        // ユーザーを検索
        let users = user_store.lock().unwrap();
        let author = users
            .iter()
            .find(|u| u.id == input.author_id)
            .cloned()
            .ok_or_else(|| async_graphql::Error::new("User not found"))?;
        drop(users);

        // 投稿を作成
        let post = Post {
            id: ID::from(Uuid::new_v4().to_string()),
            title: input.title,
            author,
            body: input.body,
            tags: input.tags.unwrap_or_default(),
            published_at: DateTimeScalar(Utc::now()),
        };

        let mut posts = post_store.lock().unwrap();
        posts.push(post.clone());
        Ok(post)
    }

    async fn delete_post(
        &self,
        ctx: &async_graphql::Context<'_>,
        id: ID,
    ) -> async_graphql::Result<bool> {
        let post_store = ctx.data_unchecked::<PostStore>();
        let mut posts = post_store.lock().unwrap();
        let initial_len = posts.len();
        posts.retain(|p| p.id != id);
        Ok(posts.len() < initial_len)
    }
}

// GraphQL Schema
type AppSchema = Schema<Query, Mutation, EmptySubscription>;

async fn graphql_handler(
    schema: web::Data<AppSchema>,
    req: GraphQLRequest,
) -> GraphQLResponse {
    schema.execute(req.into_inner()).await.into()
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // 初期ユーザーデータ
    let user_store: UserStore = Arc::new(Mutex::new(vec![
        User {
            id: ID::from("1"),
            name: "髙橋慶祐".to_string(),
            avatar_url: Some("https://example.com/avatar.png".to_string()),
        },
        User {
            id: ID::from("2"),
            name: "佐藤太郎".to_string(),
            avatar_url: None,
        },
        User {
            id: ID::from("3"),
            name: "鈴木花子".to_string(),
            avatar_url: None,
        },
        User {
            id: ID::from("4"),
            name: "伊藤次郎".to_string(),
            avatar_url: None,
        },
        User {
            id: ID::from("5"),
            name: "加藤三郎".to_string(),
            avatar_url: None,
        },
    ]));

    // 初期投稿データ
    let first_user = User {
        id: ID::from("1"),
        name: "髙橋慶祐".to_string(),
        avatar_url: Some("https://example.com/avatar.png".to_string()),
    };
    let post_store: PostStore = Arc::new(Mutex::new(vec![Post {
        id: ID::from("1"),
        title: "はじめまして".to_string(),
        author: first_user.clone(),
        body: "これは最初の投稿です。".to_string(),
        tags: vec!["はじめに".to_string(), "ブログ".to_string()],
        published_at: DateTimeScalar(Utc::now()),
    }]));

    let schema = Schema::build(Query, Mutation, EmptySubscription)
        .data(user_store)
        .data(post_store)
        .finish();

    println!("GraphQL server running at http://127.0.0.1:8000/api/graphql");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .app_data(web::Data::new(schema.clone()))
            .wrap(cors)
            .route("/api/graphql", web::post().to(graphql_handler))
            .route("/api/graphql", web::get().to(graphql_handler))
    })
    .bind("127.0.0.1:8000")?
    .run()
    .await
}
